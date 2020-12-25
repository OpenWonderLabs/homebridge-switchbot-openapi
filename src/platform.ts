import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, Service, Characteristic } from 'homebridge';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { PLATFORM_NAME, PLUGIN_NAME, DeviceURL } from './settings';
import { Humidifier } from './Devices/Humidifier';
import { irdevices, device, SwitchBotPlatformConfig, deviceResponses } from './configTypes';

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class SwitchBotPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  public axios: AxiosInstance = axios.create({
    responseType: 'json',
  });

  constructor(public readonly log: Logger, public readonly config: SwitchBotPlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform:', this.config.name);
    // only load if configured
    if (!this.config) {
      return;
    }

    // verify the config
    try {
      this.verifyConfig();
      this.log.debug('Config OK');
    } catch (e) {
      this.log.error(JSON.stringify(e.message));
      this.log.debug(JSON.stringify(e));
      return;
    }

    // setup axios interceptor to add headers / api key to each request
    this.axios.interceptors.request.use((request: AxiosRequestConfig) => {
      request.headers.Authorization = this.config.credentials?.openToken;
      request.headers['Content-Type'] = 'application/json; charset=utf8';
      return request;
    });

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', async () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      try {
        this.discoverDevices();
      } catch (e) {
        this.log.error('Failed to Discover Devices.', JSON.stringify(e.message));
        this.log.debug(JSON.stringify(e));
      }
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Verify the config passed to the plugin is valid
   */
  verifyConfig() {
    /**
     * Hidden Device Discovery Option
     * This will disable adding any device and will just output info.
     */
    this.config.devicediscovery;

    this.config.options = this.config.options || {};

    if (this.config.options) {
      this.config.options?.humidifier;
    }

    if (this.config.options!.ttl! < 120) {
      throw new Error('TTL must be above 120 (2 minutes).');
    }

    if (!this.config.options.ttl) {
      this.config.options!.ttl! = 120;
      this.log.warn('Using Default Refresh Rate.');
    }

    if (!this.config.credentials) {
      throw new Error('Missing Credentials');
    }
    if (!this.config.credentials.openToken) {
      throw new Error('Missing openToken');
    }
  }

  /**
   * this method discovers the Locations
   */
  async discoverDevices() {
    const devices = (await this.axios.get(DeviceURL)).data;
    if (this.config.devicediscovery) {
      this.deviceListInfo(devices);
    } else {
      this.log.debug(JSON.stringify(devices));
    }
    this.log.info(`Total Devices Found: ${devices.body.deviceList.length}`);
    for (const device of devices.body.deviceList) {
      if (this.config.devicediscovery) {
        this.deviceInfo(device);
      } else {
        this.log.debug(JSON.stringify(device));
      }
      // For Future Devices
      switch (device.deviceType) {
        case 'Humidifier':
          this.log.info('Discovered %s %s', device.deviceName, device.deviceType);
          this.createHumidifier(device, devices);
          break;
        default:
          this.log.info(
            `A SwitchBot Device has been discovered with Device Type: ${device.deviceType}, which is currently not supported.`,
            'Submit Feature Requests Here: https://git.io/JL14Z,',
          );
      }
    }
  }

  private async createHumidifier(device: device, devices: deviceResponses) {
    const uuid = this.api.hap.uuid.generate(
      `${device.deviceName}-${device.deviceId}-${device.deviceType}-${device.hubDeviceId}`,
    );

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the `configureAccessory` method above
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

    if (existingAccessory) {
      // the accessory already exists
      if (devices.statusCode === 100) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
        //existingAccessory.context.firmwareRevision = firmware;
        this.api.updatePlatformAccessories([existingAccessory]);
        // create the accessory handler for the restored accessory
        // this is imported from `platformAccessory.ts`
        new Humidifier(this, existingAccessory, device);
        this.log.debug(
          `Humidifier UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}-${device.hubDeviceId}`,
        );
      } else {
        this.unregisterPlatformAccessories(existingAccessory);
      }
    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory:', `${device.deviceName} ${device.deviceType}`);
      this.log.debug(`Registering new device: ${device.deviceName} ${device.deviceType} - ${device.deviceId}`);

      // create a new accessory
      const accessory = new this.api.platformAccessory(`${device.deviceName} ${device.deviceType}`, uuid);

      // store a copy of the device object in the `accessory.context`
      // the `context` property can be used to store any data about the accessory you may need
      //accessory.context.firmwareRevision = firmware;
      accessory.context.device = device;
      // accessory.context.firmwareRevision = findaccessories.accessoryAttribute.softwareRevision;
      // create the accessory handler for the newly create accessory
      // this is imported from `platformAccessory.ts`
      new Humidifier(this, accessory, device);
      this.log.debug(
        `Humidifier UDID: ${device.deviceName}-${device.deviceId}-${device.deviceType}-${device.hubDeviceId}`,
      );

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.accessories.push(accessory);
    }
  }

  public unregisterPlatformAccessories(existingAccessory: PlatformAccessory) {
    // remove platform accessories when no longer present
    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
    this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
  }

  public deviceListInfo(devices: deviceResponses) {
    this.log.warn(JSON.stringify(devices));
  }

  public deviceInfo(device: irdevices | device) {
    this.log.warn(JSON.stringify(device));
  }
}
