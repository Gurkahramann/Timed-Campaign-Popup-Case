(() => {
    const POPUP_DELAY_MS = 10000; // 10 seconds
    const POPUP_MESSAGE = "Kodu kopyala ve sepette %10 indirim için kullan.";
    const POPUP_TITLE = "Yılbaşına Özel %10 İndirim";
    const POPUP_BADGE = "Yılbaşına Özel";
    const COUPON_CODE = "YILBASI10";
    const STORAGE_KEY = "sw_popup_state";
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;// 2 hours

    class SwPopupController {
        constructor(options) {
            this.options = options;
            this.delayMs = options.delayMs;
            this.message = options.message;
            this.title = options.title;
            this.badge = options.badge;
            this.couponCode = options.couponCode;
            this.overlay = null;
            this.closeBtn = null;
            this.messageEl = null;
            this.titleEl = null;
            this.badgeEl = null;
            this.codeEl = null;
            this.copyBtn = null;
            this.copyResetTimer = null;
        }

        render() {
            // Try to use the existing DOM
            this.overlay = document.querySelector(this.options.overlaySelector);
            this.closeBtn = document.querySelector(this.options.closeSelector);
            this.messageEl = document.querySelector(this.options.messageSelector);
            this.titleEl = document.querySelector(".sw-title");
            this.badgeEl = document.querySelector(".sw-badge");
            this.codeEl = document.querySelector(".sw-coupon-code");
            this.copyBtn = document.querySelector(".sw-copy-btn");

            const alreadyPresent =
                this.overlay &&
                this.closeBtn &&
                this.messageEl &&
                this.titleEl &&
                this.badgeEl &&
                this.codeEl &&
                this.copyBtn;
            if (alreadyPresent) return;

            // If not create from scratch
            const overlay = document.createElement("div");
            overlay.className = "sw-overlay sw-hidden";

            const popup = document.createElement("div");
            popup.className = "sw-popup";

            const badge = document.createElement("div");
            badge.className = "sw-badge";
            badge.textContent = this.badge;

            const title = document.createElement("h2");
            title.className = "sw-title";
            title.textContent = this.title;

            const subtitle = document.createElement("p");
            subtitle.className = "sw-message";
            subtitle.textContent = this.message;

            const couponRow = document.createElement("div");
            couponRow.className = "sw-coupon-row";

            const codeBox = document.createElement("div");
            codeBox.className = "sw-coupon-code";
            codeBox.textContent = this.couponCode;

            const copyBtn = document.createElement("button");
            copyBtn.className = "sw-copy-btn";
            copyBtn.type = "button";
            copyBtn.textContent = "Kopyala";

            couponRow.appendChild(codeBox);
            couponRow.appendChild(copyBtn);

            const closeBtn = document.createElement("button");
            closeBtn.className = "sw-close";
            closeBtn.setAttribute("aria-label", "Popup kapat");
            closeBtn.textContent = "×";

            popup.appendChild(badge);
            popup.appendChild(title);
            popup.appendChild(subtitle);
            popup.appendChild(couponRow);
            popup.appendChild(closeBtn);
            overlay.appendChild(popup);
            document.body.appendChild(overlay);

            this.overlay = overlay;
            this.closeBtn = closeBtn;
            this.messageEl = subtitle;
            this.titleEl = title;
            this.badgeEl = badge;
            this.codeEl = codeBox;
            this.copyBtn = copyBtn;
        }

        loadState() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return { viewCount: 0, lastShownTime: 0 };
                const parsed = JSON.parse(raw);
                return {
                    viewCount: Number(parsed.viewCount) || 0,
                    lastShownTime: Number(parsed.lastShownTime) || 0,
                };
            } catch (err) {
                console.warn("Popup state could not be read:", err);
                return { viewCount: 0, lastShownTime: 0 };
            }
        }

        saveState(state) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            } catch (err) {
                console.warn("Popup state could not be saved:", err);
            }
        }

        showPopup(nextViewCount) {
            this.overlay.classList.remove("sw-hidden");
            requestAnimationFrame(() => this.overlay.classList.add("sw-visible"));
            this.saveState({ viewCount: nextViewCount, lastShownTime: Date.now() });
        }

        hidePopup() {
            this.overlay.classList.remove("sw-visible");
            this.overlay.addEventListener(
                "transitionend",
                () => this.overlay.classList.add("sw-hidden"),
                { once: true }
            );
        }

        maybeSchedulePopup() {
            const { viewCount, lastShownTime } = this.loadState();
            const now = Date.now();

           //if shown twice trigger again
            if (viewCount >= 2) return;

            // if not shown yet
            if (viewCount === 0) {
                setTimeout(() => this.showPopup(1), this.delayMs);
                return;
            }

            //  if shown once
            const diff = now - (lastShownTime || 0);
            if (diff >= TWO_HOURS_MS) {
                setTimeout(() => this.showPopup(2), this.delayMs);
            }
        }

        bindUI() {
            this.render();

            if (!this.overlay || !this.closeBtn || !this.messageEl) {
                console.warn("Popup components could not be found.");
                return false;
            }

            this.badgeEl.textContent = this.badge;
            this.titleEl.textContent = this.title;
            this.messageEl.textContent = this.message;
            this.codeEl.textContent = this.couponCode;
            this.copyBtn.textContent = "Kopyala";

            // Close button
            this.closeBtn.addEventListener("click", () => this.hidePopup());

            // When clicking on the background close
            this.overlay.addEventListener("click", (event) => {
                if (event.target === this.overlay) this.hidePopup();
            });

            // When pressing the Escape key close
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") this.hidePopup();
            });

            // Copy
            this.copyBtn.addEventListener("click", () => this.copyCode());

            return true;
        }

        copyCode() {
            const text = this.couponCode;
            const setCopied = () => {
                this.copyBtn.textContent = "Kopyalandı";
                clearTimeout(this.copyResetTimer);
                this.copyResetTimer = setTimeout(() => {
                    this.copyBtn.textContent = "Kopyala";
                }, 2000);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(setCopied).catch(() => {});
            } else {
                const temp = document.createElement("textarea");
                temp.value = text;
                temp.style.position = "fixed";
                temp.style.left = "-9999px";
                document.body.appendChild(temp);
                temp.select();
                try {
                    document.execCommand("copy");
                    setCopied();
                } finally {
                    document.body.removeChild(temp);
                }
            }
        }

        init() {
            const ok = this.bindUI();
            if (!ok) return;
            window.addEventListener("load", () => this.maybeSchedulePopup());
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const controller = new SwPopupController({
            overlaySelector: ".sw-overlay",
            closeSelector: ".sw-close",
            messageSelector: ".sw-message",
            delayMs: POPUP_DELAY_MS,
            message: POPUP_MESSAGE,
            title: POPUP_TITLE,
            badge: POPUP_BADGE,
            couponCode: COUPON_CODE,
        });
        controller.init();
    });
})();
