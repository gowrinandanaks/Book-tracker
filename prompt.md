# 📚 Book Tracker App — Prompts Used

A complete log of all the prompts used to build this Book Tracker App using **Antigravity AI**.
Built with plain **HTML**, **CSS (Vanilla)**, and **JavaScript**.

---

## Prompt 1 — Project Planning

> "I want to build a modern, minimal, aesthetic Book Tracker web app using plain HTML, CSS (Vanilla CSS), and JavaScript.
> Before writing any code, list the exact files you will create and brief details on how the layout and data structure will work.
>
> **App Requirements:**
> - **Visual Style:** Warm pastel/warm neutral color palette, elegant typography, modern rounded cards, subtle box shadows, clean spacing, and smoothly animated hover states.
> - **Core Features:**
>   - Form to add a book (Title, Author, Status: 'To read', 'Reading', 'Finished')
>   - Display book cards sorted with the newest first
>   - Inline field validation (error messages under inputs if Title or Author are empty)
>   - Live search filtering by Title or Author (case-insensitive)
>   - Ability to change a book's status via dropdown/toggle on the card
>   - Persistence using browser localStorage
> - **Extra features:** Delete button on cards, status counts bar (e.g., 'Total: 5 | Reading: 2 | Finished: 3'), and full mobile responsiveness."

---

## Prompt 2 — HTML & CSS (Structure + Design)

> "Create the `index.html` and `style.css` files.
>
> **Design Requirements:**
> - Header with a modern title and subtitle (e.g., 'My Library')
> - Top section: A sleek status summary bar showing book counts ('Total', 'To Read', 'Reading', 'Finished')
> - Form section: Inputs for Title (text input), Author (text input), and Status (dropdown select with options: 'To read', 'Reading', 'Finished'), followed by an 'Add Book' button. Place validation message containers under the title and author inputs.
> - Controls section: A full-width search input box
> - Library grid container displaying book cards with distinct status pills/badges (color-coded for To Read, Reading, Finished)
> - Include 2–3 hardcoded mock book cards in HTML so I can see the visual aesthetic immediately
> - Ensure mobile responsiveness using CSS Grid/Flexbox"

---

## Prompt 3 — JavaScript Logic (CRUD + Validation)

> "Create the initial `app.js` logic.
>
> **Logic Needed:**
> - When the user submits the form, validate Title and Author. If either is empty, display an explicit inline error message under the respective input box (e.g., 'Please enter a title') and stop submission.
> - If valid, construct a book object (`id`, `title`, `author`, `status`, `createdAt`) and prepend it to an array so that newest books render at the top.
> - Render the card in the UI dynamically and clear the form fields.
> - Update the total and status counter counts in the summary bar dynamically."

---

## Prompt 4 — localStorage Persistence

> "Make sure data survives page refreshes.
>
> Now update `app.js` to integrate browser localStorage:
> - Save the array of books to localStorage whenever a book is added, updated, or removed.
> - On initial page load, check for saved books in localStorage. If available, parse and load them into the UI.
> - Ensure that when rendering saved books, their status state, order, and metadata are strictly preserved."

---

## Prompt 5 — Search, Status Update & Delete

> "Add search filtering and status update capabilities to `app.js`:
>
> - **Live Search:** As the user types in the search bar, filter the visible cards so only books whose title or author contain the search query are shown (case-insensitive).
> - **Status Change:** Allow users to change a book's status directly on its card (via dropdown selector or button). Updating the status must update the array, update localStorage, update the status pill badge styling on the card, and re-calculate the header summary counters.
> - **Delete Action:** Add a subtle delete icon/button on each card that removes the item from both the screen and localStorage."

---

## ✅ Final Features Built

| Feature | Status |
|---|---|
| Add book form with Title, Author, Status | ✅ |
| Inline field validation with error messages | ✅ |
| Newest books appear at the top | ✅ |
| Status summary bar with animated counters | ✅ |
| Live search with match highlighting | ✅ |
| Status change on card (updates pill + cover + stats) | ✅ |
| Delete button with fade-out animation | ✅ |
| localStorage persistence across page refreshes | ✅ |
| Seed books on first visit | ✅ |
| Toast notifications | ✅ |
| Mobile responsive layout | ✅ |
| Accessible (ARIA labels, roles) | ✅ |

---

## 🗂️ Files Created

| File | Purpose |
|---|---|
| `index.html` | App structure and HTML shell |
| `style.css` | All styling — warm pastel design, animations, responsive layout |
| `app.js` | All JavaScript logic — CRUD, search, validation, localStorage |
| `prompt.md` | This file — all prompts used to build the app |

---

## 🛠️ Tech Stack

- **HTML5** — Semantic markup
- **Vanilla CSS** — Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript** — No frameworks, no libraries
- **localStorage** — Browser-side data persistence
- **Google Fonts** — Playfair Display + Inter

---

*Built with ❤️ using [Antigravity AI](https://antigravity.dev)*
