# iMessage Redesign — June 14, 2026

## Summary

Complete visual redesign of PyTalk to match Apple's iMessage aesthetic across desktop and mobile.

---

## Desktop: iMessage for Mac

- **Sidebar**: Translucent frosted glass sidebar (macOS Messages style) with `backdrop-filter: blur(20px)`, channel avatars with gradient backgrounds, search bar placeholder, and channel labels
- **Chat area**: `#F5F5F7` background with Apple system font stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro Display`, `SF Pro Text`)
- **Message bubbles**: Apple blue (`#007AFF`) for sent, light gray (`#E9E9EB`) for received — uniform `18px` border-radius on all corners, with padding `10px 16px` ensuring straight side walls between large corner curves
- **Sender labels**: Displayed above the first message in each received group
- **Timestamp dividers**: "Today 3:42 PM" style timestamps between message groups (5-minute grouping window)
- **Compose bar**: Rounded pill-shaped input field, plus button (ghosted placeholder), and send arrow — styled like the macOS Messages compose bar. Hidden until a channel is joined, send button disabled by default
- **Header**: Clean header bar showing channel name and status, with back button for mobile
- **Custom scrollbar**: Thin macOS-style scrollbar (6px, rounded)
- **Animations**: Message bubble entrance animation (`msgIn`), modal scale+fade, smooth transitions throughout

---

## Mobile: iMessage for iPhone (≤768px)

- **Full-screen layout**: App fills entire viewport
- **Slide-over sidebar**: Tappable overlay sidebar with `box-shadow` backdrop dimming — accessed via back arrow
- **Navigation header**: Back button (chevron SVG) visible, channel name, and status
- **Larger tap targets**: 16px message font, wider bubbles (82% max-width), padding `12px 18px`
- **iOS safe areas**: Respects `safe-area-inset-top` and `safe-area-inset-bottom` for notched devices
- **Prevent zoom**: 16px minimum font size on input to prevent iOS auto-zoom
- **Small mobile tweaks**: Extra breakpoint at 380px (88% max-width, padding `10px 14px`)

---

## Bubble Shape — Rounded Rectangle, Not Pill

- **Border-radius**: Uniform `18px` on all four corners via `--bubble-radius: 18px`
- **Padding**: `10px 16px` vertical padding ensures straight side walls between the large corner quarter-circles
- Single-line messages (~41px tall): 5px of straight side wall — corners are large and soft, edges are straight
- Multi-line messages: clearly visible straight side walls as the bubble grows in height
- No pill/capsule shape — no continuous curvature from top to bottom

---

## Message Grouping

JavaScript groups consecutive messages from the same sender within a 5-minute window:

- `finalizeGroups()` is the single source of truth — no incremental class management in `addMessage()`
- `hasInterveningElement()` respects timestamp dividers and sender labels as group boundaries
- First message in group: `top` class → `margin-top: 10px`
- Last message in group: `bottom` class → `margin-bottom: 6px`
- Middle messages: `middle` class → no extra margins
- Lone messages: no group class → just base 1px `margin-bottom`
- Within-group vertical gap: 1px (continuous stack feel)
- Between-group gap: 6px + 10px = 16px (plus any timestamp/sender label margins)
- Debounce: 50ms for live messages, immediate for history loads

---

## Color Settings

Settings modal with 8 color swatch options for the sent bubble color:

| Color | Hex |
|---|---|
| Blue (default) | `#007AFF` |
| Purple | `#8B5CF6` |
| Green | `#30D158` |
| Teal | `#14B8A6` |
| Red | `#FF6B6B` |
| Indigo | `#6366F1` |
| Amber | `#F59E0B` |
| Pink | `#EC4899` |

Active swatch shows a dark ring indicator. Color is set via CSS variable `--bubble-sent`.

---

## CSS Variables

| Variable | Value | Purpose |
|---|---|---|
| `--bubble-sent` | `#007AFF` | Sent message background |
| `--bubble-sent-text` | `#ffffff` | Text color on sent bubbles |
| `--bubble-rcvd` | `#E9E9EB` | Received bubble background |
| `--bubble-rcvd-text` | `#000000` | Text color on received bubbles |
| `--bubble-radius` | `18px` | Uniform corner radius |
| `--chat-bg` | `#F5F5F7` | Chat area background |
| `--sidebar-bg` | `rgba(240, 240, 243, 0.92)` | Sidebar background (frosted) |
| `--header-bg` | `rgba(245, 245, 247, 0.85)` | Chat header background |
| `--compose-bg` | `#FFFFFF` | Compose bar background |
| `--system-gray` | `#8E8E93` | Secondary text / labels |
| `--separator` | `rgba(0, 0, 0, 0.08)` | Border/divider lines |
| `--sidebar-active` | `rgba(0, 122, 255, 0.12)` | Selected channel highlight |

---

## Files Changed

- **`templates/index.html`** — Complete restructure: auth overlay with Apple-style cards, app container with frosted-glass sidebar, chat header with back button, messages container, iMessage-style compose bar (hidden until channel joined)
- **`static/styles.css`** — Full rewrite (~430 lines): Apple system font stack, iMessage colors, bubble geometry, message grouping spacing, mobile responsive layout with safe areas, settings modal
- **`static/chat.js`** — Added mobile detection, message grouping with `finalizeGroups()`, `hasInterveningElement()` for group boundary detection, sidebar toggle, compose bar visibility logic, color swatch active state tracking
- **`updates/style.md`** — This file
