# StarRez EZ Package Tracker

This is a tampermonkey script (but you can also just paste it into your console) that adds a much simpler method of checking in packages to the University of Kentucky's StarRez system.

This tool is of almost no use to anyone outside of the University of Kentucky, but feel free to take a look.

## To install

1. Add the [Tampermonkey](https://www.tampermonkey.net/) extension to your browser
2. Open the extensions's dashboard (click on its icon and then click dashboard)
3. Go to the utilites tab
4. Paste [[https://raw.githubusercontent.com/jthoward64/ez-starrez-package-tracking/main/ez-package-tracker.js](https://jthoward64.github.io/ez-starrez-package-tracking/ez-package-tracker.js)](https://jthoward64.github.io/ez-starrez-package-tracking/ez-package-tracker.js) into "Import from URL"
5. When prompted press install
6. Profit

## How to use

When enabled, EZ Package Tracker will inject code into the StarRez website. This will add a box to the Quick Information tab of the student's profile.

![Screenshot of the new box](./screenshots/Blank%20Tracker.png)

To use the tracker, select the relevant box (checking a package in or out) and either type the barcode in and press enter or scan the barcode.

Then simple fill in the pickup location, the sipping type, any notes you have (optional), and press submit.

![Screenshot of an in-progress form](./screenshots/Selecting%20a%20Package.png)

In some cases, the EZ Package Tracker may auto-detect the shipping type, in which case it will be auto-selected. Please double check this as it is somewhat unreliable, if it is wrong, you can change it just like normal.

![Screenshot of an auto-detected shipping type](./screenshots/Automatic%20Shipping%20Type.png)

## New Features

- Added a the ability to lock dropdowns to persist their selection across multiple packages
- Added a way to change the default building, allowing multiple residence halls to use the tracker

## Future plans

- Scroll to the form when it is opened
- (maybe) Add a completely new page dedicated to checking in packages
