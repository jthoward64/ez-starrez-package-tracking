// ==UserScript==
// @name         StarRez EZ Package Tracking
// @namespace    http://tampermonkey.net/
// @version      1.0.1
// @description  Adds an easy-to-use form to the Quick Information page of StarRez
// @author       Joshua Tag Howard
// @match        https://starport.uky.edu/StarRezWeb/main/directory
// @icon         https://www.google.com/s2/favicons?sz=64&domain=uky.edu
// @grant        none
// ==/UserScript==
{
    /**
     * Gets the entry id of the current entry from the url hash
     */
    function getEntryId(): string | null {
        const hash = window.top?.location.hash;
        const indexOfHash = hash?.indexOf("entry");
        if (indexOfHash == null) {
            return null;
        }
        const hashStartingWithEntry = hash?.substring(indexOfHash);
        if (hashStartingWithEntry == null) {
            return null;
        }
        const hashStartingWithEntryId = hashStartingWithEntry.substring(hashStartingWithEntry.indexOf(":") + 1);
        const entryId = hashStartingWithEntryId.substring(0, hashStartingWithEntryId.indexOf(":"));

        // Just in case, make sure it's a number
        if (Number.isNaN(Number.parseInt(entryId))) {
            return null;
        }

        return entryId;
    }

    /**
     * Tries to locate the main pane of the detail screen
     * @returns {Element | null | undefined} The main pane of the detail screen
     */
    function getMainPane(): HTMLDivElement | null {
        const entryId = getEntryId();
        let foundDiv: HTMLDivElement | null = null;
        if (entryId) {
            const detailScreen = document.getElementById(`entry${entryId}-detail-screen`);
            if (detailScreen != null) {
                const article = detailScreen.getElementsByTagName("article").item(0);
                if (article != null) {
                    const foundElement = article.getElementsByClassName("fieldset-block").item(0);
                    if (foundElement != null && foundElement instanceof HTMLDivElement) {
                        foundDiv = foundElement;
                    }
                }
            }
        }
        return foundDiv;
    }

    /**
     * Adds the EZ Package Tracking form to the main pane of the detail screen
     */
    async function submitPackage({ status, location, shippingType, trackingNumber, building, comments }: {
        status: string, location: string, shippingType?: string, trackingNumber: string, building: string, comments?: string
    }) {
        const entryId = getEntryId();

        const myHeaders = new Headers();
        myHeaders.append("Accept", "application/json, text/javascript, */*; q=0.01");
        myHeaders.append("Accept-Language", "en-US,en;q=0.5");
        myHeaders.append("Accept-Encoding", "gzip, deflate, br");
        myHeaders.append("Content-Type", "application/json; charset=utf-8");
        // @ts-ignore
        myHeaders.append("__RequestVerificationToken", document.getElementsByName("__RequestVerificationToken")[0].value);
        myHeaders.append("X-Requested-With", "XMLHttpRequest");
        myHeaders.append("Connection", "keep-alive");
        myHeaders.append("Sec-Fetch-Dest", "empty");
        myHeaders.append("Sec-Fetch-Mode", "no-cors");
        myHeaders.append("Sec-Fetch-Site", "same-origin");
        myHeaders.append("Pragma", "no-cache");
        myHeaders.append("Cache-Control", "no-cache");

        type FieldId = "197" | "198" | "199" | "200" | "201" | "202" | "220" | "__ChangedFields";

        interface PackageTrackingFormBody {
            parentID: number,
            key: "CustomField_Package Tracking",
            vm: {
                "197": string, "198": string, "199"?: string, "200": string, "201"?: string, "202": boolean, "220"?: string, __ChangedFields: FieldId[], FieldValues: {
                    Key: FieldId, Value: string | boolean
                }[]
            }
            handler: {
                _error: {
                    _autoFix: boolean, _autoIgnore: boolean
                }
            }
        }

        if (!entryId) {
            throw new Error("Could not find entry id, cannot submit package");
        }

        // Check for all mandatory fields
        if (!status || !location || !trackingNumber) {
            throw new Error("Missing mandatory fields (status, location, tracking number)");
        }

        /** @type {json} */
        const packageBody: PackageTrackingFormBody = {
            "parentID": parseInt(entryId), "key": "CustomField_Package Tracking", vm: {
                "197": status,
                "198": location,
                "200": trackingNumber,
                "202": true,
                __ChangedFields: [ "197", "198", "200", "202" ],
                FieldValues: [ {
                    Key: "197", Value: status
                }, {
                    Key: "198", Value: location
                }, {
                    Key: "200", Value: trackingNumber
                }, {
                    Key: "202", Value: true
                } ]
            }, "handler": {
                "_error": {
                    "_autoFix": false, "_autoIgnore": false
                }
            }
        };

        if (shippingType) {
            packageBody.vm["199"] = shippingType;
            packageBody.vm.FieldValues.push({
                Key: "199", Value: shippingType
            });
            packageBody.vm.__ChangedFields.push("199");
        }
        if (comments) {
            packageBody.vm["201"] = comments;
            packageBody.vm.FieldValues.push({
                Key: "201", Value: comments
            });
            packageBody.vm.__ChangedFields.push("201");
        }
        if (building) {
            packageBody.vm["220"] = building;
            packageBody.vm.FieldValues.push({
                Key: "220", Value: building
            });
            packageBody.vm.__ChangedFields.push("220");
        }
        packageBody.vm.FieldValues.push({
            Key: "__ChangedFields", Value: packageBody.vm.__ChangedFields.join(",")
        });

        const res = await fetch("https://starport.uky.edu/StarRezWeb/Main/EntryCustomField/EditKeyData", {
            method: 'POST',
            headers: myHeaders,
            body: JSON.stringify(packageBody),
            redirect: 'follow',
            credentials: 'include'
        });

        if (res.status !== 200) {
            console.error(await res.text());
            throw new Error("Failed to submit package, see log for more details");
        }

        // I don't know why this is needed (or if it even is), but it seems to help make sure the email gets sent
        const secondRes = await fetch(`https://starport.uky.edu/StarRezWeb/Main/EntryCustomField/ShowKey?key=CustomField_Package%20Tracking&parentID=${entryId}`, {
            method: 'GET', headers: myHeaders, redirect: 'follow', credentials: 'include'
        });

        if (secondRes.status !== 200) {
            console.error(await secondRes.text());
            throw new Error("Failed to submit package, see log for more details");
        }

        alert("Package submitted successfully!");
        console.log("Package submitted successfully!", await res.json(), await secondRes.json());
    }

    /**
     * Shows the form to submit a package
     */
    function handleTrackingNumberSubmit(trackingNumber: string, status: string) {
        let statusId: string;

        if (status === "Received by front desk") {
            statusId = "received";
        } else if (status === "Issued to student") {
            statusId = "issued";
        } else {
            throw new Error("Invalid status");
        }

        const trackingNumberId = trackingNumber.replace(/\s+/g, '');
        const packageFormId = `${statusId}-package-form-${trackingNumberId}`;
        if (document.getElementById(packageFormId) != null) {
            alert(`You have already opened a${status.match("^[aieouAIEOU].*") ? "n" : ""} ${status} form for tracking number "${trackingNumber}", enter a different tracking number or cancel the open form. If no form is open, reload the page.`);
            return;
        }

        const packageForm = document.createElement("form");
        packageForm.id = packageFormId;
        packageForm.innerHTML = `
<div class="details ui-details" style="padding-bottom: 8px;">
    <ul class="edit-fields"
        style="padding: 8px; margin: 4px; border: 4px outset black; display: flex; flex-direction: column; gap: 0.5rem">
        <li><label title="Tracking Number">Tracking Number:</label>${trackingNumber}</li>

        <li><label title="Parcel Status">Parcel Status:</label>${status}</li>

        <li style="flex-direction: row">
            <label for="${statusId}-package-location-${trackingNumberId}" title="Parecel Pickup Location">Parcel Pickup Location:</label>
            <div class="edit-control ui-select-list ui-dropdown-container dropdown-container editable-dropdown ui-editable-dropdown ui-controls-container large">
                <div class="ui-dropdown-controls-container controls-container">
                    <div class="editable-dropdown-icon"></div>
                    <div class="ui-dropdown-container-caption dropdown-container-caption"
                         id="${statusId}-package-location-${trackingNumberId}-text">
                    </div>
                    <select class="ui-input" name="location" id="${statusId}-package-location-${trackingNumberId}" required>
                        <option value=""></option>
                        <option value="Front Desk">Front Desk</option>
                        <option value="Mailbox">Mailbox</option>
                    </select>
                </div>
            </div>
        </li>

        <li style="flex-direction: row">
            <label for="${statusId}-package-shipping-type-${trackingNumberId}" title="Shipping Type">Shipping Type:</label>
            <div style="display: flex; flex-direction: column; gap: 0.5em">
                <div class="edit-control ui-select-list ui-dropdown-container dropdown-container editable-dropdown ui-editable-dropdown ui-controls-container large">
                    <div class="ui-dropdown-controls-container controls-container">
                        <div class="editable-dropdown-icon"></div>
                        <div class="ui-dropdown-container-caption dropdown-container-caption"
                             id="${statusId}-package-shipping-type-${trackingNumberId}-text">
                        </div>
                        <select name="shipping-type" id="${statusId}-package-shipping-type-${trackingNumberId}" required>
                            <option value=""></option>
                            <option value="Amazon">Amazon Delivery</option>
                            <option value="USPS">USPS</option>
                            <option value="FedEx">FedEx</option>
                            <option value="UPS">UPS</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <span id="${statusId}-package-shipping-type-${trackingNumberId}-hint"></span>
            </div>
        </li>

        <li style="flex-direction: row">
            <label for="${statusId}-package-comments-${trackingNumberId}" title="Comments">Comments:</label>
            <div class="edit-control ui-textarea textarea ui-controls-container large">
                <div>
                    <textarea class="large ui-input" id="${statusId}-package-comments-${trackingNumberId}" maxlength="5000"
                              name="comments" placeholder="<empty>" spellcheck="true"></textarea>
                </div>
            </div>
        </li>

        <p>Parcel Building Received In: <strong>Holmes Hall</strong></p>

        <p>"Submit Parcel" will be enabled automatically</p>

        <div style="flex-direction: row; justify-content: space-around">
            <button type="submit" class="ui-detail-wizards sr_button_primary sr_button">Submit Package</button>
            <button type="reset" class="ui-close-popup sr_button_secondary sr_button"
                    id="${statusId}-package-cancel-button-${trackingNumberId}">Cancel
            </button>
        </div>
    </ul>
</div>
`
        packageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();

            console.log("Getting ready to submit package");

            if (e.target != null && e.target instanceof HTMLFormElement) {
                const formData = new FormData(e.target);
                const location = formData.get("location");
                const shippingType = formData.get("shipping-type");
                const comments = formData.get("comments");

                if (location == null || shippingType == null) {
                    alert("Please fill out all fields");
                    return;
                }

                if (typeof location !== "string" || typeof shippingType !== "string" || (comments != null && typeof comments !== "string")) {
                    throw new Error("Invalid form data");
                }

                const submitPackageArg: Parameters<typeof submitPackage>[0] = {
                    trackingNumber, status, location, building: "Holmes Hall",
                }

                if (shippingType) {
                    submitPackageArg.shippingType = shippingType;
                }
                if (comments) {
                    submitPackageArg.comments = comments;
                }

                console.log("Submitting package", submitPackageArg);
                submitPackage(submitPackageArg).catch(console.error);
            }

            packageForm.remove();
        });

        packageForm.addEventListener('reset', () => {
            packageForm.remove();
        });

        const mainPane = getMainPane();

        const onPackageSelectionChanged = (selector: HTMLSelectElement) => {
            const selectorText = document.getElementById(selector.id + '-text');

            if (selector instanceof HTMLSelectElement && selectorText != null) {
                selectorText.innerText = selector.selectedOptions.item(0)?.label ?? "";
            }

            const shippingTypeHint = document.getElementById(`${statusId}-package-shipping-type-${trackingNumberId}-hint`);
            if (shippingTypeHint != null) {
                shippingTypeHint.innerText = "";
            }
        }

        if (mainPane) {
            mainPane.appendChild(packageForm);

            const locationSelector = document.getElementById(`${statusId}-package-location-${trackingNumberId}`);
            if (locationSelector instanceof HTMLSelectElement) {
                locationSelector.addEventListener('change', () => onPackageSelectionChanged(locationSelector));
            }

            const shippingTypeSelect = document.getElementById(`${statusId}-package-shipping-type-${trackingNumberId}`);
            const shippingTypeHint = document.getElementById(`${statusId}-package-shipping-type-${trackingNumberId}-hint`);
            if (shippingTypeSelect instanceof HTMLSelectElement) {
                shippingTypeSelect.addEventListener('change', () => onPackageSelectionChanged(shippingTypeSelect));
            }

            const guessedHint = "Shipping type is just a guess, please double check";

            if (shippingTypeSelect == null || !(shippingTypeSelect instanceof HTMLSelectElement)) {
                console.error("Could not find shipping type select element");
            } else {
                // Let's try and guess what kind of shipping this is
                let didMatch = false;

                if (trackingNumber.startsWith("TBA") || trackingNumber.startsWith("TBM") || trackingNumber.startsWith("TBC")) {
                    // This is most likely a package that is being delivered by Amazon, so we can automatically fill in the shipping type
                    shippingTypeSelect.value = "Amazon";
                    didMatch = true;
                } else if (trackingNumber.match(/\b(1Z ?[0-9A-Z]{3} ?[0-9A-Z]{3} ?[0-9A-Z]{2} ?[0-9A-Z]{4} ?[0-9A-Z]{3} ?[0-9A-Z]|[\dT]\d\d\d ?\d\d\d\d ?\d\d\d)\b/)) {
                    // Probably UPS
                    shippingTypeSelect.value = "UPS";
                    didMatch = true;
                } else if (trackingNumber.match(/(\b96\d{20}\b)|(\b\d{15}\b)|(\b\d{12}\b)/) || trackingNumber.match(/\b((98\d\d\d\d\d?\d\d\d\d|98\d\d) ?\d\d\d\d ?\d\d\d\d( ?\d\d\d)?)\b/) || trackingNumber.match(/^[0-9]{15}$/)) {
                    // Probably FedEx
                    shippingTypeSelect.value = "FedEx";
                    didMatch = true;
                } else if (trackingNumber.match(/(\b\d{30}\b)|(\b91\d+\b)|(\b\d{20}\b)/) || trackingNumber.match(/^E\D\d{9}\D{2}$|^9\d{15,21}$/) || trackingNumber.match(/^91[0-9]+$/) || trackingNumber.match(/^[A-Za-z]{2}[0-9]+US$/)) {
                    // Probably USPS
                    shippingTypeSelect.value = "USPS";
                    didMatch = true;
                }

                if (didMatch) {
                    onPackageSelectionChanged(shippingTypeSelect);
                    if (shippingTypeHint) {
                        shippingTypeHint.innerText = guessedHint;
                    }
                }
            }
        } else {
            console.error("Could not find main pane, aborting");
        }
    }

    function onEntryPageOpened() {
        'use strict';

        const mainPane = getMainPane();

        if (mainPane == null) {
            throw new Error("Could not find main pane");
        }

        function keyDownReceivedPackage(event: KeyboardEvent) {
            if (event.key === "Enter") {
                if (event.target == null || !(event.target instanceof HTMLInputElement)) {
                    throw new Error("event.target is not an input element");
                }

                if (!event.target.value) {
                    alert("Please enter a tracking number");
                    return;
                }
                handleTrackingNumberSubmit(event.target.value, "Received by front desk");
                event.target.value = "";
            }
        }

        function keyDownIssuedPackage(event: KeyboardEvent) {
            if (event.key === "Enter") {
                if (event.target == null || !(event.target instanceof HTMLInputElement)) {
                    throw new Error("event.target is not an input element");
                }

                if (!event.target.value) {
                    alert("Please enter a tracking number");
                    return;
                }
                handleTrackingNumberSubmit(event.target.value, "Issued to student");
                event.target.value = "";
            }
        }

        const ezTrackingHeader = document.createElement("div");
        ezTrackingHeader.classList.add("header");
        ezTrackingHeader.innerHTML = `<div class="caption ui-fieldset-caption">EZ Package Tracking</div>`;
        mainPane.appendChild(ezTrackingHeader);

        const trackingNumberBoxes = document.createElement("div");
        trackingNumberBoxes.id = "tracking-number-boxes";
        mainPane.appendChild(trackingNumberBoxes);

        const trackingNumberInputs = document.createElement("div");

        const trackingNumberInputsStyle = document.createAttribute("style");
        trackingNumberInputsStyle.value = "padding: 8px; margin: 4px; border-width: 1px; border-color: black; display: flex; flex-direction: column; gap: 8px";
        trackingNumberInputs.attributes.setNamedItem(trackingNumberInputsStyle);

        const trackingNumberInputsClass = document.createAttribute("class");
        trackingNumberInputsClass.value = "details ui-details";
        trackingNumberInputs.attributes.setNamedItem(trackingNumberInputsClass);

        trackingNumberInputs.innerHTML = `<ul class="edit-fields">
    <li>
        <p>
            The following two fields are custom code written by an RA. They are not official UK or StarRez software and
            may eventually stop working without warning. However, odds are they will work just fine, and if it does
            break it should be pretty obvious.
        </p>
        <p>
            To use them, select the "received package" box if you are checking in a package that you have received.
            Select the "issued package" box if you are checking out a package to a student. Then, enter the tracking
            number of the package in the appropriate field or use the scanner to scan the barcode on the package. The
            field is triggered by the "Enter" key which the scanner will send. If you are typing it in, you can press
            "Enter" after entering the tracking number. You will then be prompted to enter the package's details and
            submit it. The form will then disappear and the package will be logged automatically.
        </p>
    </li>
    <li>
        <label for="received-package-tracking-number" style="white-space: pre-line;" title="Tracking Number (received package)">Tracking Number\n(received package):</label>
        <div class="edit-control ui-text text ui-controls-container medium">
            <div>
                <input aria-required="false" class="medium ui-input" id="received-package-tracking-number"
                       name="received-package-tracking-number" placeholder="<empty>" spellcheck="true" type="text">
            </div>
        </div>
    </li>
    <li>
        <label for="issued-package-tracking-number" style="white-space: pre-line;" title="Tracking Number (issued package)">Tracking Number\n(issued package):</label>
        <div class="edit-control ui-text text ui-controls-container medium">
            <div>
                <input aria-required="false" class="medium ui-input" id="issued-package-tracking-number"
                       name="received-package-tracking-number" placeholder="<empty>" spellcheck="true" type="text">
            </div>
        </div>
    </li>
</ul>
`;
        trackingNumberBoxes.appendChild(trackingNumberInputs);

        const issuedPackageTrackingNumberInput = document.getElementById("issued-package-tracking-number");
        const receivedPackageTrackingNumberInput = document.getElementById("received-package-tracking-number");

        if (issuedPackageTrackingNumberInput == null) {
            throw new Error("Could not find issued package tracking number input");
        }
        if (receivedPackageTrackingNumberInput == null) {
            throw new Error("Could not find received package tracking number input");
        }

        receivedPackageTrackingNumberInput.addEventListener("keydown", keyDownReceivedPackage);
        issuedPackageTrackingNumberInput.addEventListener("keydown", keyDownIssuedPackage);

        console.log("EZ Package Tracking fields added successfully");
    }

    (function () {
        let oldUrl = "";

        console.log("EZ Package Tracking script loaded, waiting for resident entry page");

        setInterval(() => {
            const newUrl = window.location.href;
            if (newUrl !== oldUrl) {
                const entryId = getEntryId();
                if (newUrl.endsWith(":quick%20information") && newUrl.startsWith("https://starport.uky.edu/StarRezWeb/main/directory#") && newUrl.indexOf("entry") > -1 && entryId != null) {
                    if (document.getElementById(`entry${entryId}-detail-screen`) != null) {
                        console.log("Resident entry page opened, adding EZ Package Tracking form");
                        onEntryPageOpened();
                        oldUrl = newUrl;
                    }
                }
            }
        }, 500);
    })();
}
