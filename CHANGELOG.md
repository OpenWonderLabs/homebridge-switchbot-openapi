# Changelog

All notable changes to this project will be documented in this file. This project uses [Semantic Versioning](https://semver.org/)

## [Version 2.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v2.0.0...v2.1.0) (2021-01-20)

### Changes

- Refined Support for IR TV.
  - Now DIY TVs are Supported
  - Until an Update to the SwitchBot API, only Power and Volume will work.
- Adds Support for Projectors - Displayed As a TV.
  - Also Supports DIY Projectors.
- Adds Support for DVD - Displayed As a Set Top Box.
  - Also Supports DIY DVD.
- Adds Support for Set Top Box - Displayed As a Set Top Box.
  - Also Supports DIY Set Top Box.
- Adds Support for Streamer - Displayed As a Streaming Stick.
  - Also Supports DIY Streamer.
- Adds Support for Speaker - Displayed As a Speaker.
  - Also Supports DIY Speaker.
- Adds Support for IR Fans
  - Allows for Adding Rotation Speed Characteristic If Fan Supports it, This will effect all Fans.
  - Allows for Adding Swing Mode Characteristic If Fan Supports it, This will effect all Fans.
- Adds Support for IR Lights
- Adds Support for IR Air Conditioners.
- Adds Support for IR Air Purifiers.
- Adds Support for IR Water Heaters.
- Fixed Logging, where only SwitchBot Device Count was being logged and not IR Devices.
- Fixed Issue with Min/Max Values on Current Position of Curtains Working for Close and Open.

## [Version 2.0.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.4...v2.0.0) (2021-01-14)

### Major Changes

- _IMPORTANT_

  BEFORE UPDATING TO `v2.0.0`, YOU WILL NEED TO CLEAR CACHE ON ALL YOUR SWITCHBOT DEVICES

  IF YOU DON'T YOU WILL GET DUPLICATE DEVICES IN YOUR CACHE.

- Changes made to `uuid`, so it doesn't cause duplicate devices going forward if connecting to different Hub.
  - `uuid` is the Unique ID that is Generated to Create each Accessory.
    - Before `uuid` was using `deviceName`, `deviceId`, `deviceType`, and `hubDeviceId`
    - Now `uuid` is now using `deviceName`, `deviceId`, `deviceType`

### Changes

- Adds initial Support for IR TV.
  - Supports Volume Up and Down in Control Center.
  - Supports On and Off in Home App.
- Removed status update from Bots that was un-needed.

## [Version 1.2.4](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.3...v1.2.4) (2021-01-13)

### Changes

- Updated logging on `Hidden Devices` so that they are not displayed as discovered or as not able to register.

## [Version 1.2.3](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.2...v1.2.3) (2021-01-12)

### Changes

- Added logging for IR Devices when connected to a [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini) or [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus).

## [Version 1.2.2](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.1...v1.2.2) (2021-01-12)

### Changes

- Added logging for [SwitchBot Hub Mini](https://www.switch-bot.com/products/switchbot-hub-mini), When discovered.
- Added logging for [SwitchBot Hub Plus](https://www.switch-bot.com/products/switchbot-hub-plus), When discovered.

## [Version 1.2.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.2.0...v1.2.1) (2021-01-11)

### Changes

- Fixed unneeded logging for Bots.

## [Version 1.2.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.1.0...v1.2.0) (2021-01-11)

### Changes

- Adds Support for [SwitchBot Bot](https://www.switch-bot.com/products/switchbot-bot).
  - You must set your Bot's Device ID in the Press Mode or Switch Mode Bot Settings (Advanced Settings > Bot Settings)
    - Press Mode - Turns on then instantly turn it off.
    - Switch Mode - Turns on and keep it on until it is turned off.
      - This can get out of sync, since API doesn't give me a status.
      - To Correct you must go into the SwitchBot App and correct the status of either `On` or `Off`.
- Added option to set Mininum Step Config for [SwitchBot Curtain](https://www.switch-bot.com/products/switchbot-curtain), lower the ammount of commands being sent.

## [Version 1.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.0.1...v1.1.0) (2021-01-08)

### Changes

- Allow for Hiding Devices based off of `DeviceID` instead of `DeviceType`.
- Adds Support for [SwitchBot Meter](https://www.switch-bot.com/products/switchbot-meter).
- Adds Beta Support for [SwitchBot Curtain](https://www.switch-bot.com/products/switchbot-curtain).

## [Version 1.0.1](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v1.0.0...v1.0.1) (2020-12-25)

### Changes

- Fixed issue where humidifier wouldn't turn back on when adjusting relative humidity threshold if humdifier was off.

## [Version 1.0.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/compare/v0.1.0...v1.0.0) (2020-12-25)

### Changes

- Offical Release of OpenToken Switchbot API Support.
- Adds Support for [SwitchBot Humidifier](https://www.switch-bot.com/products/switchbot-smart-humidifier).

## [Version 0.1.0](https://github.com/OpenWonderLabs/homebridge-switchbot-openapi/releases/tag/v0.1.0) (2020-12-19)

### Changes

- Initial Release.
- This release will only valid that your Open Token Works.
