// ==UserScript==
// @name         StarRez EZ Package Tracking
// @namespace    http://tampermonkey.net/
// @version      1.1.1
// @description  Adds an easy-to-use form to the Quick Information page of StarRez
// @author       Joshua Tag Howard
// @match        https://starport.uky.edu/StarRezWeb/main/directory
// @icon         https://www.google.com/s2/favicons?sz=64&domain=uky.edu
// @grant        none
// ==/UserScript==
{
  function createCookie(name: string, value: string, days: number) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      var expires = "; expires=" + date.toUTCString();
    } else var expires = "";

    document.cookie = name + "=" + value + expires + "; path=/";
  }

  function readCookie(name: string): string | null {
    var nameEQ = name + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function eraseCookie(name: string) {
    createCookie(name, "", -1);
  }

  const cookiePrefix = "ez-package-tracker-";
  const cookieNameSavedLocation = cookiePrefix + "saved-location";
  const cookieNameSavedBuilding = cookiePrefix + "saved-building";
  const cookieNameSavedShippingType = cookiePrefix + "saved-shipping-type";

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
    const hashStartingWithEntryId = hashStartingWithEntry.substring(
      hashStartingWithEntry.indexOf(":") + 1
    );
    const entryId = hashStartingWithEntryId.substring(
      0,
      hashStartingWithEntryId.indexOf(":")
    );

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
      const detailScreen = document.getElementById(
        `entry${entryId}-detail-screen`
      );
      if (detailScreen != null) {
        const article = detailScreen.getElementsByTagName("article").item(0);
        if (article != null) {
          const foundElement = article
            .getElementsByClassName("fieldset-block")
            .item(0);
          if (foundElement != null && foundElement instanceof HTMLDivElement) {
            foundDiv = foundElement;
          }
        }
      }
    }
    return foundDiv;
  }

  function createSelect(
    statusId: string,
    trackingNumberId: string,
    selectTitle: string,
    selectSlug: string,
    formName: string,
    selectOptions: string[],
    defaultValueCookieName?: string
  ): { element: HTMLLIElement, getValue: () => string } {
    let defaultValue: string = "";
    let isValueSaved = false;
    if (defaultValueCookieName) {
      const savedValue = readCookie(defaultValueCookieName);
      if (savedValue) {
        defaultValue = savedValue;
        isValueSaved = true;
      }
    }

    const defaultValueText = selectOptions.find((option) => {
      return option === defaultValue;
    });
    if (defaultValueText) {
      defaultValue = defaultValueText;
    }

    const listItem = document.createElement("li");
    listItem.style.flexDirection = "row";
    const label = document.createElement("label");
    label.htmlFor = `${statusId}-${selectSlug}-${trackingNumberId}`;
    label.title = selectTitle;
    label.innerText = selectTitle;
    listItem.appendChild(label);
    const dropdown = document.createElement("div");
    dropdown.className =
      "edit-control ui-select-list ui-dropdown-container dropdown-container editable-dropdown ui-editable-dropdown ui-controls-container large";
    // If we have a default value, disable the dropdown
    dropdown.classList.toggle("disabled", isValueSaved);
    listItem.appendChild(dropdown);
    const dropdownControls = document.createElement("div");
    dropdownControls.className =
      "ui-dropdown-controls-container controls-container";
    dropdown.appendChild(dropdownControls);
    const dropdownIcon = document.createElement("div");
    dropdownIcon.className = "editable-dropdown-icon";
    dropdownControls.appendChild(dropdownIcon);
    const dropdownCaption = document.createElement("div");
    dropdownCaption.className =
      "ui-dropdown-container-caption dropdown-container-caption";
    dropdownCaption.id = `${statusId}-${selectSlug}-${trackingNumberId}-text`;
    dropdownControls.appendChild(dropdownCaption);
    if (defaultValue) dropdownCaption.innerText = defaultValue;
    const dropdownSelect = document.createElement("select");
    dropdownSelect.className = "ui-input";
    dropdownSelect.name = formName;
    dropdownSelect.id = `${statusId}-${selectSlug}-${trackingNumberId}`;
    dropdownSelect.required = true;
    dropdownSelect.disabled = isValueSaved;
    dropdownControls.appendChild(dropdownSelect);
    dropdownControls.onchange = (e) => {
      const select = e.target as HTMLSelectElement;
      dropdownCaption.innerText = select.value;
    };

    if (defaultValueCookieName) {
      const lockButton = document.createElement("button");
      lockButton.className = "sr_button sr_button_secondary";
      lockButton.type = "button";
      lockButton.title = "Lock";

      const lockIcon = document.createElement("i");
      lockIcon.className = isValueSaved ? "fa fa-lock" : "fa fa-unlock";
      lockButton.appendChild(lockIcon);
      listItem.appendChild(lockButton);

      lockButton.onclick = () => {
        const select = document.getElementById(
          `${statusId}-${selectSlug}-${trackingNumberId}`
        ) as HTMLSelectElement;
        if (select != null) {
          if (isValueSaved) {
            eraseCookie(defaultValueCookieName);
            lockIcon.className = "fa fa-unlock";
            select.disabled = false;
            isValueSaved = false;
            // Enable the dropdown
            dropdown.classList.toggle("disabled", false);
          } else {
            createCookie(defaultValueCookieName, select.value, 365);
            lockIcon.className = "fa fa-lock";
            select.disabled = true;
            isValueSaved = true;
            // Disable the dropdown
            dropdown.classList.toggle("disabled", true);
          }
        }
      };
    }

    for (const selectOption of selectOptions) {
      const option = document.createElement("option");
      option.value = selectOption;
      option.innerText = selectOption;
      if (
        defaultValueCookieName &&
        readCookie(defaultValueCookieName) === option.value
      ) {
        option.selected = true;
      }
      dropdownSelect.appendChild(option);
    }

    return {
      element: listItem,
      getValue: () => {
        return (document.getElementById(
          `${statusId}-${selectSlug}-${trackingNumberId}`
        ) as HTMLSelectElement).value;
      },
    };
  }

  function makeStarRezHeaders(): Headers {
    const myHeaders = new Headers();
    myHeaders.append(
      "Accept",
      "application/json, text/javascript, */*; q=0.01"
    );
    myHeaders.append("Accept-Language", "en-US,en;q=0.5");
    myHeaders.append("Content-Type", "application/json; charset=utf-8");
    myHeaders.append(
      "__RequestVerificationToken",
      // @ts-ignore
      document.getElementsByName("__RequestVerificationToken")[0].value
    );
    myHeaders.append("X-Requested-With", "XMLHttpRequest");
    myHeaders.append("Pragma", "no-cache");
    myHeaders.append("Cache-Control", "no-cache");
    return myHeaders;
  }

  function getPossibleBuildings(): Promise<string[] | null> {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "GET",
      `/StarRezWeb/Main/EntryCustomField/EditKeyData?parentID=${getEntryId()}&key=CustomField_Package%20Tracking`
    );

    const headers = makeStarRezHeaders();
    for (const [key, value] of headers.entries()) {
      xhr.setRequestHeader(key, value);
    }

    xhr.responseType = "text";

    return new Promise((resolve, reject) => {
      xhr.send();
      xhr.onload = () => {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
          var parser = new DOMParser();
          var xmlDoc = parser.parseFromString(xhr.responseText, "text/html");
          const selectElements = xmlDoc.getElementsByTagName("select");
          if (selectElements.length === 0) {
            reject("Could not find select element");
            return;
          }
          // Find the select element with the most options and double check that it's the last one, if not the api has changed and this whole thing is broken
          let selectElement: HTMLSelectElement | null = null;
          let maxCount = 0;
          for (const element of selectElements) {
            if (element instanceof HTMLSelectElement) {
              if (element.options.length > maxCount) {
                maxCount = element.options.length;
                selectElement = element;
              }
            }
          }
          if (selectElement == null) {
            reject("Could not find select element");
            return;
          } else if (selectElement.options.length !== maxCount) {
            reject(
              "Select element is not the last one, the EZ Package Tracker is probably broken"
            );
            return;
          } else {
            const buildings: string[] = [];
            for (const option of selectElement.options) {
              buildings.push(option.text);
            }
            resolve(buildings);
          }
        } else {
          reject(xhr.statusText);
        }
      };
    });
  }

  /**
   * Adds the EZ Package Tracking form to the main pane of the detail screen
   */
  async function submitPackage({
    status,
    location,
    shippingType,
    trackingNumber,
    building,
    comments,
  }: {
    status: string;
    location: string;
    shippingType?: string;
    trackingNumber: string;
    building: string;
    comments?: string;
  }) {
    const entryId = getEntryId();

    const myHeaders = makeStarRezHeaders();

    type FieldId =
      | "197"
      | "198"
      | "199"
      | "200"
      | "201"
      | "202"
      | "220"
      | "__ChangedFields";

    interface PackageTrackingFormBody {
      parentID: number;
      key: "CustomField_Package Tracking";
      vm: {
        "197": string;
        "198": string;
        "199"?: string;
        "200": string;
        "201"?: string;
        "202": boolean;
        "220"?: string;
        __ChangedFields: FieldId[];
        FieldValues: {
          Key: FieldId;
          Value: string | boolean;
        }[];
      };
      handler: {
        _error: {
          _autoFix: boolean;
          _autoIgnore: boolean;
        };
      };
    }

    if (!entryId) {
      throw new Error("Could not find entry id, cannot submit package");
    }

    // Check for all mandatory fields
    if (!status || !location || !trackingNumber) {
      throw new Error(
        "Missing mandatory fields (status, location, tracking number)"
      );
    }

    /** @type {json} */
    const packageBody: PackageTrackingFormBody = {
      parentID: parseInt(entryId),
      key: "CustomField_Package Tracking",
      vm: {
        "197": status,
        "198": location,
        "200": trackingNumber,
        "202": true,
        __ChangedFields: ["197", "198", "200", "202"],
        FieldValues: [
          {
            Key: "197",
            Value: status,
          },
          {
            Key: "198",
            Value: location,
          },
          {
            Key: "200",
            Value: trackingNumber,
          },
          {
            Key: "202",
            Value: true,
          },
        ],
      },
      handler: {
        _error: {
          _autoFix: false,
          _autoIgnore: false,
        },
      },
    };

    if (shippingType) {
      packageBody.vm["199"] = shippingType;
      packageBody.vm.FieldValues.push({
        Key: "199",
        Value: shippingType,
      });
      packageBody.vm.__ChangedFields.push("199");
    }
    if (comments) {
      packageBody.vm["201"] = comments;
      packageBody.vm.FieldValues.push({
        Key: "201",
        Value: comments,
      });
      packageBody.vm.__ChangedFields.push("201");
    }
    if (building) {
      packageBody.vm["220"] = building;
      packageBody.vm.FieldValues.push({
        Key: "220",
        Value: building,
      });
      packageBody.vm.__ChangedFields.push("220");
    }
    packageBody.vm.FieldValues.push({
      Key: "__ChangedFields",
      Value: packageBody.vm.__ChangedFields.join(","),
    });

    const res = await fetch(
      "https://starport.uky.edu/StarRezWeb/Main/EntryCustomField/EditKeyData",
      {
        method: "POST",
        headers: myHeaders,
        body: JSON.stringify(packageBody),
        redirect: "follow",
        credentials: "include",
      }
    );

    if (res.status !== 200) {
      console.error(await res.text());
      throw new Error("Failed to submit package, see log for more details");
    }

    // I don't know why this is needed (or if it even is), but it seems to help make sure the email gets sent
    const secondRes = await fetch(
      `https://starport.uky.edu/StarRezWeb/Main/EntryCustomField/ShowKey?key=CustomField_Package%20Tracking&parentID=${entryId}`,
      {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
        credentials: "include",
      }
    );

    if (secondRes.status !== 200) {
      console.error(await secondRes.text());
      throw new Error("Failed to submit package, see log for more details");
    }

    alert("Package submitted successfully!");
    console.log(
      "Package submitted successfully!",
      await res.json(),
      await secondRes.json()
    );
  }

  /**
   * Shows the form to submit a package
   */
  async function handleTrackingNumberSubmit(
    trackingNumber: string,
    status: string
  ) {
    let statusId: string;

    if (status === "Received by front desk") {
      statusId = "received";
    } else if (status === "Issued to student") {
      statusId = "issued";
    } else {
      throw new Error("Invalid status");
    }

    const trackingNumberId = trackingNumber.replace(/\s+/g, "");
    const packageFormId = `${statusId}-package-form-${trackingNumberId}`;
    if (document.getElementById(packageFormId) != null) {
      alert(
        `You have already opened a${status.match("^[aieouAIEOU].*") ? "n" : ""
        } ${status} form for tracking number "${trackingNumber}", enter a different tracking number or cancel the open form. If no form is open, reload the page.`
      );
      return;
    }

    const packageForm = document.createElement("form");
    packageForm.id = packageFormId;

    const packageFormOuterDiv = document.createElement("div");
    packageFormOuterDiv.style.paddingBottom = "8px";
    packageFormOuterDiv.className = "details ui-details";
    packageForm.appendChild(packageFormOuterDiv);

    const editFields = document.createElement("ul");
    editFields.className = "edit-fields";
    editFields.style.padding = "8px";
    editFields.style.margin = "4px";
    editFields.style.border = "4px outset black";
    editFields.style.display = "flex";
    editFields.style.flexDirection = "column";
    editFields.style.gap = "0.5rem";
    packageFormOuterDiv.appendChild(editFields);

    const trackingNumberLi = document.createElement("li");
    editFields.appendChild(trackingNumberLi);
    const trackingNumberLabel = document.createElement("label");
    trackingNumberLabel.title = "Tracking Number";
    trackingNumberLabel.innerText = "Tracking Number:";
    trackingNumberLi.appendChild(trackingNumberLabel);
    trackingNumberLi.appendChild(document.createTextNode(trackingNumber));

    const statusLi = document.createElement("li");
    editFields.appendChild(statusLi);
    const statusLabel = document.createElement("label");
    statusLabel.title = "Parcel Status";
    statusLabel.innerText = "Parcel Status:";
    statusLi.appendChild(statusLabel);
    statusLi.appendChild(document.createTextNode(status));

    const pickupLocationEl = createSelect(
      statusId,
      trackingNumberId,
      "Parcel Pickup Location",
      "package-location",
      "location",
      ["", "Front Desk", "Mailbox"],
      cookieNameSavedLocation
    );
    editFields.appendChild(
      pickupLocationEl.element
    );

    // Replace above with call to createSelect
    const shippingTypeEl = createSelect(
      statusId,
      trackingNumberId,
      "Shipping Type",
      "package-shipping-type",
      "shipping-type",
      ["", "Amazon Delivery", "USPS", "FedEx", "UPS", "Other"]
    );
    editFields.appendChild(
      shippingTypeEl.element
    );

    const commentsLi = document.createElement("li");
    commentsLi.style.flexDirection = "row";
    editFields.appendChild(commentsLi);
    const commentsLabel = document.createElement("label");
    commentsLabel.htmlFor = `${statusId}-package-comments-${trackingNumberId}`;
    commentsLabel.title = "Comments";
    commentsLabel.innerText = "Comments:";
    commentsLi.appendChild(commentsLabel);
    const commentsTextarea = document.createElement("div");
    commentsTextarea.className =
      "edit-control ui-textarea textarea ui-controls-container large";
    commentsLi.appendChild(commentsTextarea);
    const commentsTextareaDiv = document.createElement("div");
    commentsTextarea.appendChild(commentsTextareaDiv);
    const commentsTextareaInput = document.createElement("textarea");
    commentsTextareaInput.className = "large ui-input";
    commentsTextareaInput.id = `${statusId}-package-comments-${trackingNumberId}`;
    commentsTextareaInput.maxLength = 5000;
    commentsTextareaInput.name = "comments";
    commentsTextareaInput.placeholder = "<empty>";
    commentsTextareaInput.spellcheck = true;
    commentsTextareaDiv.appendChild(commentsTextareaInput);

    const possibleBuildings = await getPossibleBuildings();
    if (!possibleBuildings) {
      alert(
        "Failed to get list of buildings, please reload the page and try again, if the problem persists the EZ Package Tracker may be broken"
      );
      return;
    }

    const buildingEl = createSelect(
      statusId,
      trackingNumberId,
      "Building",
      "package-building",
      "building",
      possibleBuildings,
      cookieNameSavedBuilding
    );
    editFields.appendChild(
      buildingEl.element
    );

    const submitNote = document.createElement("p");
    submitNote.innerText = '"Submit Parcel" will be enabled automatically';
    editFields.appendChild(submitNote);

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.className = "ui-detail-wizards sr_button_primary sr_button";
    submitButton.innerText = "Submit Package";
    editFields.appendChild(submitButton);

    const cancelButton = document.createElement("button");
    cancelButton.type = "reset";
    cancelButton.className = "ui-close-popup sr_button_secondary sr_button";
    cancelButton.id = `${statusId}-package-cancel-button-${trackingNumberId}`;
    cancelButton.innerText = "Cancel";

    packageForm.addEventListener("submit", (e) => {
      e.preventDefault();
      e.stopPropagation();

      console.log("Getting ready to submit package");

      if (e.target != null && e.target instanceof HTMLFormElement) {
        const location = pickupLocationEl.getValue();
        const shippingType = shippingTypeEl.getValue();
        const comments = commentsTextareaInput.value;
        const building = buildingEl.getValue();

        if (location == null || shippingType == null || building == null) {
          alert("Please fill out all fields");
          return;
        }

        if (
          typeof location !== "string" ||
          typeof shippingType !== "string" ||
          (comments != null && typeof comments !== "string") ||
          typeof building !== "string"
        ) {
          throw new Error("Invalid form data");
        }

        const submitPackageArg: Parameters<typeof submitPackage>[0] = {
          trackingNumber,
          status,
          location,
          building,
        };

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

    packageForm.addEventListener("reset", () => {
      packageForm.remove();
    });

    const mainPane = getMainPane();

    const onPackageSelectionChanged = (selector: HTMLSelectElement) => {
      const selectorText = document.getElementById(selector.id + "-text");

      if (selector instanceof HTMLSelectElement && selectorText != null) {
        selectorText.innerText = selector.selectedOptions.item(0)?.label ?? "";
      }

      const shippingTypeHint = document.getElementById(
        `${statusId}-package-shipping-type-${trackingNumberId}-hint`
      );
      if (shippingTypeHint != null) {
        shippingTypeHint.innerText = "";
      }
    };

    if (mainPane) {
      mainPane.appendChild(packageForm);

      const locationSelector = document.getElementById(
        `${statusId}-package-location-${trackingNumberId}`
      );
      if (locationSelector instanceof HTMLSelectElement) {
        locationSelector.addEventListener("change", () =>
          onPackageSelectionChanged(locationSelector)
        );
      }

      const shippingTypeSelect = document.getElementById(
        `${statusId}-package-shipping-type-${trackingNumberId}`
      );
      const shippingTypeHint = document.getElementById(
        `${statusId}-package-shipping-type-${trackingNumberId}-hint`
      );
      if (shippingTypeSelect instanceof HTMLSelectElement) {
        shippingTypeSelect.addEventListener("change", () =>
          onPackageSelectionChanged(shippingTypeSelect)
        );
      }

      const guessedHint = "Shipping type is just a guess, please double check";

      if (
        shippingTypeSelect == null ||
        !(shippingTypeSelect instanceof HTMLSelectElement)
      ) {
        console.error("Could not find shipping type select element");
      } else {
        // Let's try and guess what kind of shipping this is
        let didMatch = false;

        if (
          trackingNumber.startsWith("TBA") ||
          trackingNumber.startsWith("TBM") ||
          trackingNumber.startsWith("TBC")
        ) {
          // This is most likely a package that is being delivered by Amazon, so we can automatically fill in the shipping type
          shippingTypeSelect.value = "Amazon";
          didMatch = true;
        } else if (
          trackingNumber.match(/(\b\d{30}\b)|(\b91\d+\b)|(\b\d{20}\b)/) ||
          trackingNumber.match(/^E\D\d{9}\D{2}$|^9\d{15,21}$/) ||
          trackingNumber.match(/^91[0-9]+$/) ||
          trackingNumber.match(/^[A-Za-z]{2}[0-9]+US$/)
        ) {
          // Probably USPS
          shippingTypeSelect.value = "USPS";
          didMatch = true;
        } else if (
          trackingNumber.match(
            /\b(1Z ?[0-9A-Z]{3} ?[0-9A-Z]{3} ?[0-9A-Z]{2} ?[0-9A-Z]{4} ?[0-9A-Z]{3} ?[0-9A-Z]|[\dT]\d\d\d ?\d\d\d\d ?\d\d\d)\b/
          )
        ) {
          // Probably UPS
          shippingTypeSelect.value = "UPS";
          didMatch = true;
        } else if (
          trackingNumber.match(/(\b96\d{20}\b)|(\b\d{15}\b)|(\b\d{12}\b)/) ||
          trackingNumber.match(
            /\b((98\d\d\d\d\d?\d\d\d\d|98\d\d) ?\d\d\d\d ?\d\d\d\d( ?\d\d\d)?)\b/
          ) ||
          trackingNumber.match(/^[0-9]{15}$/)
        ) {
          // Probably FedEx
          shippingTypeSelect.value = "FedEx";
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
    "use strict";

    const mainPane = getMainPane();

    if (mainPane == null) {
      throw new Error("Could not find main pane");
    }

    function keyDownReceivedPackage(event: KeyboardEvent) {
      if (event.key === "Enter") {
        if (
          event.target == null ||
          !(event.target instanceof HTMLInputElement)
        ) {
          throw new Error("event.target is not an input element");
        }

        if (!event.target.value) {
          alert("Please enter a tracking number");
          return;
        }
        handleTrackingNumberSubmit(
          event.target.value,
          "Received by front desk"
        );
        event.target.value = "";
      }
    }

    function keyDownIssuedPackage(event: KeyboardEvent) {
      if (event.key === "Enter") {
        if (
          event.target == null ||
          !(event.target instanceof HTMLInputElement)
        ) {
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
    trackingNumberInputsStyle.value =
      "padding: 8px; margin: 4px; border-width: 1px; border-color: black; display: flex; flex-direction: column; gap: 8px";
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
          submit it. The form will then disappear and the package will be logged automatically. You can use the
          lock icons next to each dropdown to set a default value for that field, to clear the default value simply
          click the lock icon again.
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

    const issuedPackageTrackingNumberInput = document.getElementById(
      "issued-package-tracking-number"
    );
    const receivedPackageTrackingNumberInput = document.getElementById(
      "received-package-tracking-number"
    );

    if (issuedPackageTrackingNumberInput == null) {
      throw new Error("Could not find issued package tracking number input");
    }
    if (receivedPackageTrackingNumberInput == null) {
      throw new Error("Could not find received package tracking number input");
    }

    receivedPackageTrackingNumberInput.addEventListener(
      "keydown",
      keyDownReceivedPackage
    );
    issuedPackageTrackingNumberInput.addEventListener(
      "keydown",
      keyDownIssuedPackage
    );

    console.log("EZ Package Tracking fields added successfully");
  }

  (function () {
    let oldUrl = "";

    console.log(
      "EZ Package Tracking script loaded, waiting for resident entry page"
    );

    setInterval(() => {
      const newUrl = window.location.href;
      if (newUrl !== oldUrl) {
        const entryId = getEntryId();
        if (
          newUrl.endsWith(":quick%20information") &&
          newUrl.startsWith(
            "https://starport.uky.edu/StarRezWeb/main/directory#"
          ) &&
          newUrl.indexOf("entry") > -1 &&
          entryId != null
        ) {
          if (
            document.getElementById(`entry${entryId}-detail-screen`) != null
          ) {
            console.log(
              "Resident entry page opened, adding EZ Package Tracking form"
            );
            onEntryPageOpened();
            oldUrl = newUrl;
          }
        }
      }
    }, 500);
  })();
}
