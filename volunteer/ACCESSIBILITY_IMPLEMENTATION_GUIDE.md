# Accessibility Implementation Guide

## Overview

This guide documents the accessibility (a11y) features added to the volunteer workstation. All changes follow WCAG 2.1 Level AA standards and use industry best practices.

---

## Semantic ARIA Roles Used

### Form Container
```html
<div role="form">
```
- Identifies the login screen as a form
- Assistive technology announces "form" when focused
- Helps users understand the purpose of the container

### Navigation Container
```html
<nav role="navigation" aria-label="主菜单">
```
- `role="navigation"` identifies navigation region
- `aria-label` provides descriptive name
- Users can jump to navigation with screen reader shortcuts

### Main Content
```html
<div role="main">
```
- Identifies primary content area
- Users can skip to main content quickly
- Only one `role="main"` per page (enforced by accessibility standards)

### Tab Interface
```html
<div role="tablist">              <!-- Tab container -->
  <button role="tab" 
          aria-selected="true"   <!-- Currently active tab -->
          aria-controls="tab-tasks">  <!-- Links to panel ID -->
    接单大厅
  </button>
</div>
<div role="tabpanel" id="tab-tasks">
  <!-- Tab content -->
</div>
```
- `role="tablist"` - Container for all tabs
- `role="tab"` - Individual tab buttons
- `role="tabpanel"` - Content area for each tab
- `aria-selected` - Shows which tab is active
- `aria-controls` - Links tab to its panel (by ID)

### List Structure
```html
<div role="list" aria-label="任务列表">
  <article role="listitem" aria-label="任务 #123: 已接单">
    Task content
  </article>
</div>
```
- `role="list"` - Container (not `<ul>`)
- `role="listitem"` - Individual items
- `aria-label` - Describes each item fully
- Useful when items aren't simple `<li>` elements

---

## ARIA Properties & Their Values

### aria-label
Provides accessible name for an element when visible text is insufficient.

```html
<!-- Button with visible text - aria-label optional -->
<button>Login</button>

<!-- Input without associated label - aria-label required -->
<input aria-label="手机号" placeholder="13710000051" />

<!-- List describing each item -->
<div role="listitem" aria-label="任务 #123: 已接单">
```

**Best Practice:** Use `aria-label` when:
- No visible label exists
- Visible text needs clarification
- Multiple items need individual descriptions

### aria-required
Indicates that form input is mandatory.

```html
<input aria-required="true" />  <!-- Required -->
<input aria-required="false" /> <!-- Optional -->
```

**Announced as:** "Phone number, required"

### aria-invalid
Indicates if form input has validation error.

```javascript
// Dynamic based on errors
aria-invalid="${state.error ? 'true' : ''}"

// Only set when there IS an error
${state.error && state.error.includes('手机号') ? 'aria-invalid="true"' : ''}
```

**Announced as:** "Phone number, invalid"

### aria-describedby
Links element to another element that describes it (usually error message).

```html
<input aria-describedby="code-error" />
<p id="code-error">验证码必须是6位数字</p>
```

**Effect:** When user focuses input, both input AND description are announced

### aria-busy
Indicates whether element is currently in a loading or updating state.

```html
<!-- JavaScript updates this as state changes -->
<button aria-busy="${state.loginLoading}">
  ${state.loginLoading ? '登录中...' : '登录'}
</button>
```

**Announced as:** "Button, busy" or "Button"

### aria-selected
Indicates whether tab/option is currently selected.

```html
<!-- Updated when state.currentTab changes -->
aria-selected="${state.currentTab === 'tasks' ? 'true' : 'false'}"
```

**Announced as:** "Tab, selected" or "Tab, not selected"

### aria-controls
Identifies element being controlled by current element (usually tab controls panel).

```html
<button role="tab" aria-controls="tab-tasks">Tasks</button>
<div role="tabpanel" id="tab-tasks">Content</div>
```

**Effect:** Screen readers announce relationship between control and controlled element

---

## ARIA Live Regions (aria-live)

Enable announcement of dynamic content without page refresh.

### Politeness Levels

```html
<!-- "polite" - Wait for pause in speech, then announce -->
<p aria-live="polite">信息已更新</p>

<!-- "assertive" - Interrupt current speech to announce -->
<p aria-live="assertive">严重错误！</p>

<!-- "off" (default) - Don't announce -->
<p aria-live="off">不播报这个</p>
```

### Combined with role="alert"

```html
<!-- Error announced immediately and forcefully -->
<p role="alert" aria-live="polite">验证码错误</p>
```

**Implementation in code:**
```html
${state.error ? `<p id="code-error" class="error" 
                     role="alert" 
                     aria-live="polite">
                  ${escapeHtml(state.error)}
                </p>` : ''}
```

### With aria-busy

```html
<!-- Announces both the text AND the busy state -->
<p aria-live="polite" aria-busy="true">
  任务加载中...
</p>
```

**Result:** Screen reader says "Loading tasks... (busy)"

---

## Dynamic Attribute Updates

Attributes must update in real-time as application state changes.

### Tab Selection
```javascript
// When user clicks tab
state.currentTab = 'training';
render();

// Attributes update to:
aria-selected="false"  // 接单大厅 tab
aria-selected="true"   // 技能培训 tab
aria-selected="false"  // 我的账户 tab
```

### Form Validation
```javascript
// When validation error occurs
state.error = '手机号格式错误';
render();

// Attributes become:
aria-invalid="true"           // phone input
aria-invalid="false"          // code input
role="alert" aria-live="polite" // error message
```

### Loading States
```javascript
// When sending SMS
state.smsLoading = true;
render();

// Attributes become:
aria-busy="true"  // send-sms button
disabled          // button becomes disabled

// When complete
state.smsLoading = false;
render();

// Attributes become:
aria-busy="false" // button returns to normal
disabled removed  // button is re-enabled
```

---

## Keyboard Navigation

All components should support keyboard navigation:

### Form Inputs
```
Tab: Navigate to next field
Shift+Tab: Navigate to previous field
Tab+Enter: Submit on button
```

### Tab Interface
```
Tab: Move to next tab
Shift+Tab: Move to previous tab
Space/Enter: Activate tab
Arrow Keys: Navigate within tabs (optional - implement if desired)
```

### Lists
```
Tab: Move to next list item
Shift+Tab: Move to previous list item
Space/Enter: Activate buttons within items
```

---

## Screen Reader Announcements

### Login Flow
```
Page loads:
  "Form"

User tabs to phone field:
  "Phone number, required, edit text"

User tabs to code field:
  "Verification code, required, edit text, 
   described by 'Verification code must be 6 digits'"

User enters wrong code and submits:
  "Alert: Verification code must be 6 digits"
  [Error announced immediately]

User clicks get code button:
  Button becomes: "Get verification code, busy"
  
After SMS sent:
  "Verification code sent, check SMS"
  [Announcement appears politely]
```

### Dashboard Tab Navigation
```
Page loads:
  "Main"
  "Navigation: Main menu"
  "Tab list"
  
First tab:
  "Tab, Tasks, selected"
  
Tab content:
  "Tab panel: Task list, list"
  
User clicks next tab:
  Previous: "Tab, Training, not selected"
  Current: "Tab, Training, selected"
  Content: "Tab panel: Training records"
```

### Task List Navigation
```
First task:
  "List item: Task #123: Assigned status"
  "Service type: Companion service"
  "Service recipient: Elder user (13710000001)"
  "Scheduled time: 2024-01-15 14:00"
  "Completed time: -"
  Button: "Mark complete, button"

Loading state:
  "Loading tasks... (busy)"
  
Empty state:
  "No tasks available currently"
```

---

## Testing Checklist

### Automated Testing (Browser DevTools)
- [ ] Run Axe accessibility audit
- [ ] Check color contrast (WCAG AA minimum)
- [ ] Verify heading hierarchy
- [ ] Check for duplicate IDs

### Manual Testing with NVDA (Windows)
```
1. Start NVDA
2. Open application
3. Tab through entire form
4. Trigger validation errors
5. Click submit button
6. Navigate through all tabs
7. Review all announced content
```

### Manual Testing with VoiceOver (macOS)
```
1. Enable VoiceOver (Cmd+F5)
2. Use VO+Right Arrow to navigate
3. Use VO+Space to activate elements
4. Check rotor (VO+U) for structure
5. Verify form elements properly announced
```

### Keyboard-Only Testing
```
1. Use only Tab/Shift+Tab to navigate
2. Use only Enter/Space to activate
3. Verify all interactive elements reachable
4. Check focus visibility
5. Verify focus order logical
```

### Mobile Screen Reader Testing
- [ ] Test on iOS with VoiceOver
- [ ] Test on Android with TalkBack
- [ ] Verify touch gestures work
- [ ] Check announcements are clear

---

## Common Mistakes to Avoid

### ❌ Don't
```html
<!-- Redundant - already has aria-label -->
<button aria-label="Login">Login</button>

<!-- aria-live without role="alert" for errors -->
<p aria-live="polite">Error occurred</p>

<!-- Wrong politeness level -->
<p aria-live="assertive">Information updated</p>

<!-- aria-label on everything -->
<div aria-label="wrapper">Content</div>

<!-- Disconnect aria-selected from actual selection -->
<!-- button says aria-selected=true but CSS shows it inactive -->
```

### ✅ Do
```html
<!-- Use aria-label only when needed -->
<input aria-label="手机号" />

<!-- Use role="alert" for error messages -->
<p role="alert" aria-live="polite">Error message</p>

<!-- Use "polite" for informational updates -->
<p aria-live="polite">Information updated</p>

<!-- Use aria-label sparingly, meaningfully -->
<div role="list" aria-label="任务列表">Tasks</div>

<!-- Keep aria-selected in sync with visual state -->
<button role="tab" 
        aria-selected="${isActive}"
        style="${isActive ? 'background: white' : 'transparent'}">
```

---

## Performance Considerations

### Dynamic String Building
```javascript
// aria-labels with dynamic content
aria-label="任务 ${escapeHtml(task.order_no || `#${task.id}`)}: ${escapeHtml(getStatusLabel(task.status))}"
```

**Impact:** Minimal - string interpolation happens at render time

### Live Region Updates
```javascript
// Each render, aria-live regions are recreated
<p aria-live="polite">${escapeHtml(state.info)}</p>
```

**Impact:** Screen readers may re-announce content. This is acceptable for:
- Transient messages (appear then disappear)
- Status updates users need to know

**Optimization:** Clear info after delay if needed
```javascript
function toast(message) {
  state.info = message;
  render();
  setTimeout(() => {
    state.info = '';
    render();
  }, 3000);
}
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| ARIA Roles | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| aria-live | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| aria-label | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| aria-controls | ✅ Full | ✅ Full | ⚠️ Limited | ✅ Full |
| Tab roles | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

---

## Accessibility Maintenance

### After Adding New Features
1. [ ] Add appropriate ARIA roles
2. [ ] Include aria-labels if text not visible
3. [ ] Test with screen reader
4. [ ] Verify keyboard navigation
5. [ ] Update this documentation

### Regular Audits
- Run automated tools (Axe, Lighthouse) quarterly
- Manual screen reader testing monthly
- Gather feedback from users with disabilities
- Monitor accessibility issues on GitHub

### Resources
- ARIA Practices Guide: https://www.w3.org/WAI/ARIA/apg/
- WebAIM: https://webaim.org/
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
