// ==UserScript==
// @name         Timed Campaign Popup Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  10 seconds delayed and 2 hours interval timed campaign popup case study work.
// @author       Gurkan Kahraman - Case Study
// @match        https://www.suwen.com.tr/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const injectStyles = () => {
        if (document.getElementById('sw-popup-styles')) return;
        const style = document.createElement("style");
        style.id = 'sw-popup-styles';
        style.innerHTML = `
            .sw-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(17, 24, 39, 0.6); padding: 20px; opacity: 0; pointer-events: none; backdrop-filter: blur(2px); transition: opacity 200ms ease; z-index: 999999; }
            .sw-overlay.sw-visible { opacity: 1; pointer-events: auto; }
            .sw-popup { position: relative; width: min(500px, 100%); background: #ffffff; border-radius: 18px; padding: 30px 32px 28px; box-shadow: 0 26px 90px rgba(15, 23, 42, 0.22); transform: translateY(12px); transition: transform 200ms ease; font-family: ui-sans-serif, system-ui, sans-serif; }
            .sw-overlay.sw-visible .sw-popup { transform: translateY(0); }
            .sw-badge { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: rgba(255, 143, 160, 0.18); color: #d9465e; font-weight: 700; font-size: 13px; text-transform: uppercase; }
            .sw-title { margin: 16px 0 10px; font-size: 24px; font-weight: 800; color: #111827; }
            .sw-message { margin: 0 0 22px; line-height: 1.65; font-size: 16px; color: #374151; }
            .sw-coupon-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; margin-bottom: 4px; }
            .sw-coupon-code { display: flex; align-items: center; justify-content: center; padding: 18px 16px; border-radius: 12px; background: rgba(255, 143, 160, 0.12); border: 2px dashed #ff7f94; color: #b91c1c; font-size: 26px; font-weight: 800; }
            .sw-copy-btn { border: none; border-radius: 12px; padding: 0 18px; background: #ff808b; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; min-width: 116px; }
            .sw-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border: none; background: transparent; color: #6b7280; font-size: 20px; cursor: pointer; }
            .sw-hidden { display: none !important; }
        `;
        document.head.appendChild(style);
    };

    const STORAGE_KEY = "sw_popup_state";
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    class SwPopupController {
        constructor(options) {
            this.options = options;
            this.copyResetTimer = null;
        }

        render() {
            if (document.querySelector('.sw-overlay')) return;
            const html = `
                <div class="sw-overlay sw-hidden">
                    <div class="sw-popup">
                        <button class="sw-close">×</button>
                        <div class="sw-badge">${this.options.badge}</div>
                        <h2 class="sw-title">${this.options.title}</h2>
                        <p class="sw-message">${this.options.message}</p>
                        <div class="sw-coupon-row">
                            <div class="sw-coupon-code">${this.options.couponCode}</div>
                            <button class="sw-copy-btn">Kopyala</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML("beforeend", html);
            this.overlay = document.querySelector(".sw-overlay");
            this.copyBtn = document.querySelector(".sw-copy-btn");
            this.closeBtn = document.querySelector(".sw-close");
        }

        loadState() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                return raw ? JSON.parse(raw) : { viewCount: 0, lastShownTime: 0 };
            } catch (e) { return { viewCount: 0, lastShownTime: 0 }; }
        }

        showPopup(nextCount) {
            this.overlay.classList.remove("sw-hidden");
            setTimeout(() => this.overlay.classList.add("sw-visible"), 100);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ viewCount: nextCount, lastShownTime: Date.now() }));
        }

        hidePopup() {
            this.overlay.classList.remove("sw-visible");
            this.overlay.addEventListener(
                "transitionend",
                () => this.overlay.classList.add("sw-hidden"),
                { once: true }
            );
        }

        init() {
            injectStyles();
            this.render();
            this.closeBtn.addEventListener("click", () => this.hidePopup());

            // When clicking on the background close
            this.overlay.addEventListener("click", (event) => {
                if (event.target === this.overlay) this.hidePopup();
            });

            // When pressing the Escape key close
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") this.hidePopup();
            });
            this.copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(this.options.couponCode).then(() => {
                    this.copyBtn.textContent = "Kopyalandı!";
                    clearTimeout(this.copyResetTimer);
                    this.copyResetTimer = setTimeout(() => { this.copyBtn.textContent = "Kopyala"; }, 2000);
                });
            });

            const state = this.loadState();
            const now = Date.now();

            if (state.viewCount >= 2) {

                return;
            }
            if (state.viewCount === 0) {
                setTimeout(() => this.showPopup(1), this.options.delayMs);
            } else if (now - state.lastShownTime >= TWO_HOURS_MS) {
                setTimeout(() => this.showPopup(2), this.options.delayMs);
            }
        }
    }

    const run = () => {
        new SwPopupController({
            delayMs: 10000,
            badge: "Yılbaşına Özel",
            title: "Yılbaşına Özel %10 İndirim",
            message: "Kodu kopyala ve sepette %10 indirim için kullan.",
            couponCode: "YILBASI10"
        }).init();
    };

    if (document.readyState === "complete") run();
    else window.addEventListener("load", run);

})();