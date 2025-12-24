# Timed Campaign Popup Module

This is a pop-up module developed with VanillaJS using HTML CSS and Javascript as needed and applying the necessary instructions. If you want to use it on Suwen (a real website), you can install the TamperMonkey plugin copy the code from the `Timed Campaign Popup Module-1.0.user.js` file, create a script, paste it, and test it in your own browser.

[Click here to setup TamperMonkey](#tampermonkey-setup)

[Click here for the answers to the questions in the Case Study document](#case-study-questions-and-answers)

## Architectural Structure

Class-based architecture was preferred during scripting because it provides state encapsulation positively impacts code organization and readability and also conforms to the modern JavaScript standard.



```javascript
class SwPopupController {
    constructor(options)     // Dependency injection pattern
    render()                // DOM creation/selection
    loadState()             // State persistence
    saveState(state)        // State persistence
    showPopup(nextCount)    // Display logic
    hidePopup()             // Hide logic with animation
    maybeSchedulePopup()    // Business logic (view count algorithm)
    bindUI()                // Event binding
    copyCode()              // Clipboard operation
    init()                  // Initialization orchestrator
}
```

## Method Details

### constructor(options) - Dependency Injection Pattern

Used to retrieve values ​​from outside instead of hardcoded. Hardcoded values: `const DELAY = 10000;` → are difficult to change global variables cannot be tested and state management is messy. Therefore the constructor was preferred.

```javascript
constructor(options) {
    this.options = options;           // Save All Configurations
    this.delayMs = options.delayMs;   // delay time
    this.message = options.message;  // Message text
    this.couponCode = options.couponCode; // Coupon Code
    // Initialize all DOM references to null.
    this.overlay = null;
    this.copyBtn = null;
    // ...
}
```

### render() - DOM Creation/Selection

This method is responsible for integrating the module's interface components into the Document Object Model (DOM). The logic for creating and selecting the DOM is centralized preventing code repetition and facilitating maintenance. The method first checks for an existing structure on the page using `querySelector` if no structure is found, it creates one from scratch using `document.createElement`.

```javascript
render() {
    // First, check the existing DOM (use it if it exists in HTML)
    this.overlay = document.querySelector(this.options.overlaySelector);
    // ...
    
    //  Otherwise create
    if (alreadyPresent) return;
    
    const overlay = document.createElement("div");
    overlay.className = "sw-overlay sw-hidden";
    // Creating the entire DOM hierarchy
    document.body.appendChild(overlay);
}
```

### loadState() - State Persistence (Reading)

The logic for reading state from localStorage works here; string-to-number conversion and validation take place here.

```javascript
loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { viewCount: 0, lastShownTime: 0 }; // Default state
        const parsed = JSON.parse(raw);
        return {
            viewCount: Number(parsed.viewCount) || 0,  // Type coercion
            lastShownTime: Number(parsed.lastShownTime) || 0
        };
    } catch (err) {
        // If localStorage is corrupted or there is a parsing error it will revert to the default settings.
        return { viewCount: 0, lastShownTime: 0 };
    }
}
```

### saveState(state) - State Persistence (Writing)

The logic for writing state to localStorage works here. It includes features such as handling if localStorage is full or if writing fails and always saving in the same format. It is used within `showPopup()`.

```javascript
saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
        // If localStorage is full or the quota has been exceeded
        console.warn("Popup state could not save:", err);
    }
}
```

### showPopup(nextViewCount) - Display Logic

To consolidate the popup display logic in one place and add animation features while also updating the states as soon as it is displayed.

```javascript
showPopup(nextViewCount) {
    // Remove the hidden class (it will become visible in the DOM)
    this.overlay.classList.remove("sw-hidden");
    
    // Start the animation with requestAnimationFrame
    requestAnimationFrame(() => {
        this.overlay.classList.add("sw-visible"); // CSS transition is triggered
    });
    
    // Save the state (viewCount and timestamp)
    this.saveState({ 
        viewCount: nextViewCount, 
        lastShownTime: Date.now() 
    });
}
```

### hidePopup() - Hide Logic with Animation

The logic for closing the popup is consolidated in one place using the `transitionend` event to wait until the animation finishes and `{ once: true }` to clear the event listener. This prevents memory leaks. The X button overlay and Escape key all call the same method.

```javascript
hidePopup() {
    //  Remove the Visible class (fade-out animation starts)
    this.overlay.classList.remove("sw-visible");
    
    //  Once the animation is finished, add the hidden class (display: none)
    this.overlay.addEventListener("transitionend", () => {
        this.overlay.classList.add("sw-hidden");
    }, { once: true }); // Event listener is automatically cleared
}
```

### maybeSchedulePopup() - Business Logic (View Count Algorithm)

Business logic is separated from the UI, and processes like display count and time control are handled here. All popup display decisions are made here.

```javascript
maybeSchedulePopup() {
    // Read State
    const { viewCount, lastShownTime } = this.loadState();
    const now = Date.now();
    
    //  Max Limit Control
    if (viewCount >= 2) return; //Don't show anymore
    
    // First scan
    if (viewCount === 0) {
        setTimeout(() => this.showPopup(1), this.delayMs);
        return;
    }
    
    // Second scan (2 hours later)
    const diff = now - (lastShownTime || 0);
    if (diff >= TWO_HOURS_MS) {
        setTimeout(() => this.showPopup(2), this.delayMs);
    }
}
```

### bindUI() - Event Binding

This is where all event listeners are gathered in one place and UI preparation is done. It's called within `init()` but can be tested separately. If the event binding logic changes it's updated from this single location. It won't work if the DOM isn't ready.

```javascript
bindUI() {
    // Render the DOM
    this.render();
    
    // Check for the presence of elements.
    if (!this.overlay || !this.closeBtn || !this.messageEl) {
        return false; // Error State 
    }
    
    //  Update contents
    this.badgeEl.textContent = this.badge;
    // ...
    
    // Add event listeners
    this.closeBtn.addEventListener("click", () => this.hidePopup());
    this.overlay.addEventListener("click", (event) => {
        if (event.target === this.overlay) this.hidePopup();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") this.hidePopup();
    });
    this.copyBtn.addEventListener("click", () => this.copyCode());
    
    return true; // Success
}
```

### copyCode() - Clipboard Operation


The clipboard process is consolidated in one place and the button text changes after copying. The clipboard API can be mocked. Different copying strategies can be added in the future.

```javascript
copyCode() {
    const text = this.couponCode;
    
    
    // Callback: Called when copying is successful
    const setCopied = () => {
        this.copyBtn.textContent = "Kopyalandı";
        clearTimeout(this.copyResetTimer);
        this.copyResetTimer = setTimeout(() => {
            this.copyBtn.textContent = "Kopyala"; // It returns after 2 seconds.
        }, 2000);
    };
    
    // For Modern Browsers
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(setCopied).catch(() => {});
    } else {
        // Fallback: for older browsers
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.style.position = "fixed";
        temp.style.left = "-9999px";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        setCopied();
        document.body.removeChild(temp);
    }
}
```

### init() - Initialization Orchestrator

It controls the initialization order. It is the only method called from outside and will not run if `bindUI()` fails.

```javascript
init() {
    // Prepare the UI (DOM render + event binding)
    const ok = this.bindUI();
    
    // Exception Handling
    if (!ok) return; // Exit if DOM isn't ready.
    
    // Schedule the popup (after the page loads)
    window.addEventListener("load", () => this.maybeSchedulePopup());
}
```

## Summary

In short the reason I use this structure is that each method has a single responsibility. These methods can be tested individually.

**Storage Key**: `sw_popup_state` (Conflicts are avoided with a unique prefix.)

## Code Quality and Best Practices

### Best Practices Applied

- **Immediately-invoked Function Expressions(IIFE) Pattern**: Global scope isolation - All code is executed within anonymous functions preventing global variable conflicts.
- **Class-Based Design**: OOP principles - State and methods are grouped in a single class making code organization and maintenance easier.
- **Error Handling**: Try-catch blocks - localStorage and JSON parsing errors are caught preventing application crashes.
- **Event Cleanup**: Memory leak prevention with `{ once: true }` - Event listeners are single-use and automatically cleaned up.
- **Modern API**: `addEventListener` (instead of onclick) - Multiple listeners can be added a more flexible and modern approach.
- **Semantic HTML**: Use of `<button>`, `<h2>`, `<p>` - Meaningful HTML elements are preferred for SEO and accessibility. 
- **Accessibility**: `aria-label` attributes - Provide descriptive text for screen readers.

## TamperMonkey Setup

For Chrome browsers, add the extension from here: https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=tr Then, enable developer mode in the extension settings for TamperMonkey to work. Copy the code from Suwen Campaign Popup Module-1.0.user and paste it into a new script. After that when you go to https://www.suwen.com.tr/ you will see that the script works in the appropriate scenario.

## License and Usage

This project was developed for case study purposes. The code is written in vanilla JavaScript does not include a framework and is shared in accordance with open-source principles.

## Developer

Gurkan Kahraman - Case Study

## Case Study Questions And Answers

### Question 1.1

`document.querySelector()`: This method allows us to select an element using CSS references (class, id, attribute). It's a preferred method due to its versatility.

`document.getElementById()`: This method is used to select only elements with a specific ID. If performance isn't a concern I prefer `querySelector`. This directly and positively impacts code readability. Otherwise, I prefer `getElementById`.

### Question 1.2

Event listeners are used to trigger an action when a button is clicked. First the item is selected and assigned to a JavaScript variable then the event is listened for using the `addEventListener` method and a function is executed.

### Question 2.1

To modify an HTML element using JavaScript you first need to select the element (methods were specified in the previous question). Then a new value is assigned to this element the most common properties are `textContent` and `innerText`. As a result of this process the browser displays the corresponding value in the DOM tree.

### Question 2.2

The fundamental difference between these two features lies in how they interpret data and their security standards.

**innerText**: Treats assigned data as raw text. Even if it contains HTML tags it prints them as text not executes them. It does not read text hidden by CSS (`display: none`). It is faster because it does not parsing HTML.

**innerHTML**: Interprets data as an HTML structure. If the data contains tags it converts them into DOM elements and adds them to the page. However if data received from the user is printed directly using `innerHTML`, it can execute malicious scripts (Cross-Site Scripting). It is not recommended for use with untrusted data.

### Question 3.1

There are several methods in JavaScript for accessing and operating on elements within an array.

**ForEach() Method**: This is a functional method specific to arrays. It executes a callback for each element. It is the modern and most commonly used method.

**For...of Loop**: Introduced with ES6, this structure offers the cleanest and most readable syntax for iterating over iterable objects like arrays.

**Classic for Loop**: Provides index-based control. It is a performant option when iterating over a specific range or breaking the loop under a specific condition.

### Question 3.2

Assuming we have an array of product names (`productNames`) we can use the following method to print each name to the console.

```javascript
const productNames = ["A", "B", "C"];

productNames.forEach((product) => {
    console.log(product);
});
```

### Question 4.1

In JavaScript we check a status using a boolean variable. If a boolean variable like `isLoggedIn` or an object containing user information (`user`) exists the simplest if statement is structured as follows:

```javascript
if (isLoggedIn) {
    console.log("User logged in");
} else {
    console.log("User is not logged in");
}
```

### Question 4.2

In JavaScript, there are 8 basic values ​​that are automatically converted to `false` when conditional statements are evaluated, and these are called "FALSY" values. These are: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. All remaining values including empty objects and arrays are considered `true`.

### Question 5.1

To store user names or similar states in a way that they don't disappear even when the browser is closed `localStorage` should be used. It stores data without an expiration date. The data can only be deleted using JavaScript code or by manually clearing the user's browser cache.

### Question 5.2

`localStorage` offers a very simple and synchronous interface that works with key-value pairs. The `setItem` method is used to write data to disk. The first parameter is the "key" to access the data, and the second parameter is the "value".

```javascript
localStorage.setItem("userName", "Gurkahramann");
```

The `getItem` method retrieves previously stored data using its key name.

```javascript
const name = localStorage.getItem("userName");
console.log(name);
```
