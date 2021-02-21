import { Service, PlatformAccessory, CharacteristicEventTypes, CharacteristicValue } from 'homebridge';
import { SwitchBotPlatform } from '../platform';
import { interval, Subject } from 'rxjs';
import { debounceTime, delay, skipWhile, tap } from 'rxjs/operators';
import { DeviceURL, device, deviceStatusResponse } from '../settings';

export class Curtain {
  private service: Service;

  CurrentPosition!: CharacteristicValue;
  PositionState!: CharacteristicValue;
  TargetPosition!: CharacteristicValue;
  deviceStatus!: deviceStatusResponse;
  setNewTarget!: boolean;
  setNewTargetTimer!: NodeJS.Timeout;

  curtainUpdateInProgress!: boolean;
  doCurtainUpdate!: Subject<unknown>;

  constructor(
    private readonly platform: SwitchBotPlatform,
    private accessory: PlatformAccessory,
    public device: device,
  ) {
    // default placeholders
    this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
    if (this.platform.config.options?.curtain?.set_min || this.platform.config.options?.curtain?.set_max) {
      this.setMinMax();
      this.TargetPosition = this.CurrentPosition;
    } else {
      this.CurrentPosition = 0;
      this.TargetPosition = 0;
    }

    // this is subject we use to track when we need to POST changes to the SwitchBot API
    this.doCurtainUpdate = new Subject();
    this.curtainUpdateInProgress = false;
    this.setNewTarget = false;

    // Retrieve initial values and updateHomekit
    this.refreshStatus();

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'SwitchBot')
      .setCharacteristic(this.platform.Characteristic.Model, 'SWITCHBOT-CURTAIN-W0701600')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.device.deviceId);

    // get the WindowCovering service if it exists, otherwise create a new WindowCovering service
    // you can create multiple services for each accessory
    (this.service =
      this.accessory.getService(this.platform.Service.WindowCovering) ||
      this.accessory.addService(this.platform.Service.WindowCovering)),
    `${this.device.deviceName} ${this.device.deviceType}`;

    // To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
    // when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
    // this.accessory.getService('NAME') ?? this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE');

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      `${this.device.deviceName} ${this.device.deviceType}`,
    );

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/WindowCovering

    // create handlers for required characteristics
    this.service.setCharacteristic(this.platform.Characteristic.PositionState, this.PositionState);

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentPosition)
      .setProps({
        minStep: this.platform.config.options?.curtain?.set_minStep || 1,
        validValueRanges: [0, 100],
      })
      .onGet(async () => {
        return this.CurrentPosition;
      });

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetPosition)
      .setProps({
        minStep: this.platform.config.options?.curtain?.set_minStep || 1,
        validValueRanges: [0, 100],
      })
      .onSet(async (value: CharacteristicValue) => {
        this.TargetPositionSet(value);
      });

    // Update Homekit
    this.updateHomeKitCharacteristics();

    // Start an update interval
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.curtainUpdateInProgress))
      .subscribe(() => {
        this.refreshStatus();
      });

    // update slide progress
    interval(this.platform.config.options!.refreshRate! * 1000)
      .pipe(skipWhile(() => this.curtainUpdateInProgress))
      .subscribe(() => {
        if (this.PositionState === this.platform.Characteristic.PositionState.STOPPED) {
          return;
        }
        this.platform.log.debug('Refresh status when moving', this.PositionState);
        this.refreshStatus();
      });

    // Watch for Curtain change events
    // We put in a debounce of 100ms so we don't make duplicate calls
    this.doCurtainUpdate
      .pipe(
        tap(() => {
          this.curtainUpdateInProgress = true;
        }),
        debounceTime(this.platform.config.options!.pushRate! * 1000),
      )
      .subscribe(async () => {
        try {
          await this.pushChanges();
        } catch (e) {
          this.platform.log.error(JSON.stringify(e.message));
          this.platform.log.debug('Curtain %s -', this.accessory.displayName, JSON.stringify(e));
          this.apiError(e);
        }
        this.curtainUpdateInProgress = false;
      });
  }

  parseStatus() {
    // CurrentPosition
    this.CurrentPosition = 100 - this.deviceStatus.body.slidePosition!;
    if (this.deviceStatus.body.moving) {
      if (this.TargetPosition > this.CurrentPosition) {
        this.PositionState = this.platform.Characteristic.PositionState.INCREASING;
      } else if (this.TargetPosition < this.CurrentPosition) {
        this.PositionState = this.platform.Characteristic.PositionState.DECREASING;
      } else {
        this.platform.log.debug('Curtain %s -', this.CurrentPosition, 'standby');
        this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      }
    } else {
      if (!this.setNewTarget) {
        this.TargetPosition = this.CurrentPosition;
        this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      }
    }
    this.platform.log.debug(
      'Curtain %s CurrentPosition: %s, TargetPosition: %s, PositionState: %s',
      this.accessory.displayName,
      this.CurrentPosition,
      this.TargetPosition,
      this.PositionState,
    );
  }

  async refreshStatus() {
    try {
      this.platform.log.debug('Curtain - Reading', `${DeviceURL}/${this.device.deviceId}/status`);
      const deviceStatus: deviceStatusResponse = (
        await this.platform.axios.get(`${DeviceURL}/${this.device.deviceId}/status`)
      ).data;
      if (deviceStatus.message === 'success') {
        this.deviceStatus = deviceStatus;
        this.platform.log.debug(
          'Curtain %s refreshStatus -',
          this.accessory.displayName,
          JSON.stringify(this.deviceStatus),
        );
        this.setMinMax();
        this.parseStatus();
        this.updateHomeKitCharacteristics();
      }
    } catch (e) {
      this.platform.log.error(
        `Curtain - Failed to refresh status of ${this.device.deviceName}`,
        JSON.stringify(e.message),
        this.platform.log.debug('Curtain %s -', this.accessory.displayName, JSON.stringify(e)),
      );
      this.apiError(e);
    }
  }

  async pushChanges() {
    if (this.TargetPosition !== this.CurrentPosition) {
      this.platform.log.debug(`Pushing ${this.TargetPosition}`);
      const adjustedTargetPosition = 100 - Number(this.TargetPosition);
      const payload = {
        commandType: 'command',
        command: 'setPosition',
        parameter: `0,ff,${adjustedTargetPosition}`,
      } as any;

      this.platform.log.info(
        'Sending request for',
        this.accessory.displayName,
        'to SwitchBot API. command:',
        payload.command,
        'parameter:',
        payload.parameter,
        'commandType:',
        payload.commandType,
      );
      this.platform.log.debug('Curtain %s pushChanges -', this.accessory.displayName, JSON.stringify(payload));

      // Make the API request
      const push = await this.platform.axios.post(`${DeviceURL}/${this.device.deviceId}/commands`, payload);
      this.platform.log.debug('Curtain %s Changes pushed -', this.accessory.displayName, push.data);
    }
  }

  updateHomeKitCharacteristics() {
    if (this.CurrentPosition !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, this.CurrentPosition);
    }
    if (this.PositionState !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.PositionState, this.PositionState);
    }
    if (this.TargetPosition !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.TargetPosition);
    }
  }

  public apiError(e: any) {
    this.service.updateCharacteristic(this.platform.Characteristic.CurrentPosition, e);
    this.service.updateCharacteristic(this.platform.Characteristic.PositionState, e);
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, e);
  }

  /**
   * Handle requests to set the value of the "Target Position" characteristic
   */
  TargetPositionSet(value: CharacteristicValue) {
    this.platform.log.debug('Curtain %s - Set TargetPosition: %s', this.accessory.displayName, value);

    this.TargetPosition = value;
    this.service.updateCharacteristic(this.platform.Characteristic.TargetPosition, this.TargetPosition);

    if (value > this.CurrentPosition) {
      this.PositionState = this.platform.Characteristic.PositionState.INCREASING;
      this.setNewTarget = true;
      this.setMinMax();
    } else if (value < this.CurrentPosition) {
      this.PositionState = this.platform.Characteristic.PositionState.DECREASING;
      this.setNewTarget = true;
      this.setMinMax();
    } else {
      this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      this.setNewTarget = false;
      this.setMinMax();
    }
    this.service.setCharacteristic(this.platform.Characteristic.PositionState, this.PositionState);

    /**
     * If Curtain movement time is short, the moving flag from backend is always false.
     * The minimum time depends on the network control latency.
     */
    clearTimeout(this.setNewTargetTimer);
    if (this.setNewTarget) {
      this.PositionState = this.platform.Characteristic.PositionState.STOPPED;
      this.updateHomeKitCharacteristics();
      this.setNewTargetTimer = setTimeout(() => {
        this.platform.log.debug(
          'Curtain %s -',
          this.accessory.displayName,
          'setNewTarget',
          this.setNewTarget,
          'timeout',
        );
        this.setNewTarget = false;
      }, 10000);
    }
    this.doCurtainUpdate.next();
  }

  public setMinMax() {
    if (this.platform.config.options?.curtain?.set_min) {
      if (this.CurrentPosition <= this.platform.config.options?.curtain?.set_min) {
        this.CurrentPosition = 0;
      }
    }
    if (this.platform.config.options?.curtain?.set_max) {
      if (this.CurrentPosition >= this.platform.config.options?.curtain?.set_max) {
        this.CurrentPosition = 100;
      }
    }
  }
}
