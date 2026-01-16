# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

#### [2.2.6] - 2026-1-15

### Updated

- used active SSE connections as proxy for active visitors

#### [2.2.5] - 2026-1-15

### Added

- site health metrics

#### [2.2.4] - 2026-1-13

### Fixed

- logout cookie alignment

#### [2.2.3] - 2026-1-13

### Fixed

- major overhaul on undo stack

#### [2.2.2] - 2026-1-12

### Fixed

- clean-up on html sent to ai restyle
- Ensure sandbox mode works for gen AI

#### [2.2.1] - 2026-1-12

### Updated

- Adjusted token allowance

#### [2.2.0] - 2026-1-11

### Added

- Creative HTML AST panes

### Updated

- Major upgrade on editor UI/UX

#### [2.1.3] - 2025-12-23

### Fixed

- pass paneId to code hook

#### [2.1.2] - 2025-12-18

### Fixed

- sandbox api requires no auto profile

#### [2.1.1] - 2025-12-18

### Fixed

- better fortify sandbox askLemur with secret token

#### [2.1.0] - 2025-12-17

### Updated

- updated packages / README

#### [2.0.47] - 2025-12-17

### Added

- sandbox as target in actionLisp links

#### [2.0.46] - 2025-12-17

### Fixed

- sandbox

#### [2.0.45] - 2025-12-16

### Added

- restyle colour

#### [2.0.44] - 2025-12-16

### Fixed

- 2-col AI gen with markdown provided
- consolidated the AI gen UI
- Restyle Pane modal

#### [2.0.43] - 2025-12-02

### Fixed

- Init redirect hardening

#### [2.0.42] - 2025-11-26

### Added

- Suitcase packing/unpacking for new tenant

#### [2.0.41] - 2025-11-25

### Fixed

- Panes Preview generator

#### [2.0.40] - 2025-11-25

### Fixed

- middleware tenant id detect take 2

#### [2.0.39] - 2025-11-25

### Fixed

- middleware tenant id detect

#### [2.0.38] - 2025-11-24

### Fixed

- proper use of cookies to backend tractstack-go take 2

#### [2.0.37] - 2025-11-24

### Fixed

- proper use of cookies to backend tractstack-go

#### [2.0.36] - 2025-11-23

### Fixed

- middleware tenant detection

#### [2.0.35] - 2025-11-20

### Added

- proper storykeep/init.astro workflow for instance

#### [2.0.34] - 2025-11-20

### Fixed

- fully removed old multi-tenant reg

#### [2.0.33] - 2025-11-17

### Added

- wired up new SaaS payment gateway

#### [2.0.32] - 2025-11-16

### Removed

- multi-tenant sandbox registration

#### [2.0.31] - 2025-11-15

### Added

- allow BgNode (background image) on storage panes
- redirect path on re-auth

### Fixed

- background image on eraser and designLibrary mode

#### [2.0.30] - 2025-11-15

### Added

- upgrades on design library + gen ai designs

#### [2.0.29] - 2025-11-14

### Fixed

- sandbox profile check

#### [2.0.28] - 2025-11-12

### Updated

- default button styles
- default span styles

#### [2.0.27] - 2025-11-12

### Added

- word carousel

#### [2.0.26] - 2025-11-12

### Fixed

- add gridCss to tailwind whitelist (for real this time)

#### [2.0.25] - 2025-11-12

### Fixed

- add gridCss to tailwind whitelist

#### [2.0.24] - 2025-11-11

### Fixed

- css injection was leaking outline
- ViewportComboBox was glitching on prod; converted to controlled
- UI improvements on settings panel

#### [2.0.23] - 2025-11-11

### Fixed

- button payload persistence through edits

#### [2.0.22] - 2025-11-11

### Fixed

- tailwind reduce fn for xs breakpoint

#### [2.0.21] - 2025-11-11

### Added

- we got Grid Layout!! (fixing 2.0.20)

#### [2.0.20] - 2025-11-11

### Added

- we got Grid Layout!!

#### [2.0.19] - 2025-11-08

### Added

- rough-in for GridLayoutNode AI gen workflow

### Fixed

- data schema on AI gen workflow

#### [2.0.18] - 2025-11-04

### Added

- GridLayoutNode

#### [2.0.17] - 2025-11-03

### Fixed

- Save to Design Library
- Direct inject mode for gen AI

#### [2.0.16] - 2025-11-02

### Added

- instant sandbox!

#### [2.0.15] - 2025-11-01

### Added

- create new pane using designs or AI mix

#### [2.0.14] - 2025-10-30

### Added

- design library and live redesign !!

#### [2.0.13] - 2025-10-29

### Fixed

- major tune-up on gen AI pipeline

#### [2.0.12] - 2025-10-25

### Added

- generate with AI on panes

#### [2.0.11] - 2025-10-25

### Fixed

- sitemap fixed

#### [2.0.10] - 2025-10-24

### Added

- custom styling major enhancement

#### [2.0.9] - 2025-10-19

### Added

- ability to un-strong or em

#### [2.0.8] - 2025-10-19

### Fixed

- bunny video integration in editor

#### [2.0.7] - 2025-10-18

### Fixed

- bunny video integration via actionLisp

#### [2.0.6] - 2025-10-18

### Added

- custom HeaderWidget rough-in with resource fetching

#### [2.0.5] - 2025-10-14

### Fixed

- passing storyfragment description
- layout observers in edit.astro re-run on view transition

#### [2.0.4] - 2025-10-14

### Added

- open mode interactive disclosure

#### [2.0.3] - 2025-10-14

### Added

- horizontal scroll and min width on mobile epinet

### Fixed

- ability to edit known resources

## [2.0.2] - 2025-10-14

### Added

- belief gates exposed UI on epinets

### [2.0.1] - 2025-10-13

### Changed

- visual tune-up on epinet

### [2.0.0] - 2025-10-10

### Changed

- released 2.0.0 under MIT license

### [2.0.0-rc.71] - 2025-10-09

### Updated

- internationalized lib

### [2.0.0-rc.70] - 2025-10-08

### Added

- ProductGrid and ProductCard codehooks

### [2.0.0-rc.69] - 2025-10-07

### Added

- image fields now available on resources

### Fixed

- various UI fixes on ListContentSetup

### [2.0.0-rc.68] - 2025-10-07

### Changed

- MIT license on this repo

### [2.0.0-rc.67] - 2025-10-06

### Fixed

- epinet codehook route was missed prop for table view
- save modal has dashboard option
- toggle now self-aware! (was broken for tf before)
- ensure pending analytics events fire on page nav

### [2.0.0-rc.66] - 2025-10-06

### Fixed

- mostly UI/UX fixes in interactive disclosure
- min-w-xs on SettingsPanel; extra bottom margin in edit (avoid overlapping on small screens)

### [2.0.0-rc.65] - 2025-10-06

### Fixed

- major overhaul on HTMX + sse backend handshake

### [2.0.0-rc.64] - 2025-10-05

### Added

- proper quoting on actionLisp identifyAs

### [2.0.0-rc.63] - 2025-10-04

### Added

- major improvements on interactiveDisclosure

-### [2.0.0-rc.62] - 2025-10-04

### Added

- bootstrap icons
- interactive disclosure! (not in backend yet)
- full rebuild on actionLisp to allow declare and identifyAs actions
- button payloads on Menu too

### [2.0.0-rc.61] - 2025-10-02

### Fixed

- cleaned-up ToolMode UX
- code hook container display of variables
- escape in storykeep to return to edit mode; resets UX now

### [2.0.0-rc.60] - 2025-10-01

### Fixed

- template designs

### [2.0.0-rc.59] - 2025-10-01

### Fixed

- inner scroll in artpack config

### [2.0.0-rc.58] - 2025-09-30

### Fixed

- pane id in html for deep link (storyfragmentPane actionLisp)
- ensure tailwindToHex on visual breaks
- flipped property on visual breaks for correct colour matching
- added overflow-hidden in layout
- bgColour on ListContent and FeaturedArticle
- better loading animation

### [2.0.0-rc.57] - 2025-09-29

### Changed

- tightened up styles on codehooks

### [2.0.0-rc.56] - 2025-09-29

### Added

- no results indicator on search-widget

### Changed

- initial css

### [2.0.0-rc.55] - 2025-09-28

### Added

- featured article and search widget code hooks

### [2.0.0-rc.54] - 2025-09-27

### Added

- proper bunny video UI in editor

### [2.0.0-rc.53] - 2025-09-27

### Added

- full bunny player w/ chapters as inline widget

### [2.0.0-rc.52] - 2025-09-26

### Fixed

- incorrect css on footer

### [2.0.0-rc.51] - 2025-09-26

### Added

- proper 404

### [2.0.0-rc.50] - 2025-09-25

### Added

- Bunny video!

### [2.0.0-rc.49] - 2025-09-25

### Added

- unset + magic paths on code hooks

### [2.0.0-rc.48] - 2025-09-22

### Changed

- beautifying the search + discovery

### [2.0.0-rc.47] - 2025-09-22

### Fixed

- mobile responsive issue with autocomplete
- corrected debounce + throttling logic on search

### [2.0.0-rc.46] - 2025-09-22

### Added

- quality of life UI fixes for search

### [2.0.0-rc.45] - 2025-09-22

### Added

- full-text-search with discovery!!

### [2.0.0-rc.44] - 2025-09-20

### Changed

- made search modal and results really pretty + good UX

### [2.0.0-rc.43] - 2025-09-20

### Fixed

- eek! absolute paths on og meta

### [2.0.0-rc.42] - 2025-09-20

### Fixed

- og image in storyData for per page custom og

### [2.0.0-rc.41] - 2025-09-20

### Fixed

- more tune-up on search mobile responsiveness

### [2.0.0-rc.40] - 2025-09-20

### Fixed

- tune-up on search

### [2.0.0-rc.39] - 2025-09-20

### Added

- initSearch helper added

### [2.0.0-rc.38] - 2025-09-19

### Added

- Search results order + some style updates

### [2.0.0-rc.37] - 2025-09-19

### Added

- We got power search!

### [2.0.0-rc.36] - 2025-09-19

### Fixed

- Consistent visual effect across storykeep dashboards

### [2.0.0-rc.35] - 2025-09-19

### Changed

- Better visual effect on storykeep dashboard

### [2.0.0-rc.34] - 2025-09-18

### Fixed

- Improvements on pane slug+title with auto gen in backend; batch panes endpoint added

### [2.0.0-rc.33] - 2025-09-18

### Fixed

- Lot more UX improvements in edit workflow and pretty storykeep dashboard visual

### [2.0.0-rc.32] - 2025-09-18

### Fixed

- Lots of UX improvements in edit workflow

### [2.0.0-rc.31] - 2025-09-17

### Fixed

- EpinetTableView data access

### [2.0.0-rc.30] - 2025-09-16

### Fixed

- StoryFragmentTable delete method

### [2.0.0-rc.29] - 2025-09-16

### Fixed

- Removed caching on internal api route for orphan analysis

### [2.0.0-rc.28] - 2025-09-16

### Fixed

- Proper orphan analysis fetching

### [2.0.0-rc.27] - 2025-09-16

### Fixed

- Safer analytics fetch; avoid flooding

### [2.0.0-rc.26] - 2025-09-15

### Added

- Set/change homepage slug when editing storyfragment

### Fixed

- Various UX quality-of-life improvements

### [2.0.0-rc.25] - 2025-09-15

### Fixed

- Tailwind CSS generation pipeline

### [2.0.0-rc.24] - 2025-09-13

### Changed

- HTMX now bundle in

### [2.0.0-rc.23] - 2025-09-13

### Changed

- PUBLIC_ENABLE_BUNNY env variable added to conditionally load the playerjs

### [2.0.0-rc.22] - 2025-09-12

### Fixed

- pass proper codehook options via storyData

### [2.0.0-rc.21] - 2025-09-10

### Fixed

- proper display for code hook params

### Changed

- Cleaned-up collections, code hooks, + custom routes examples

### [2.0.0-rc.20] - 2025-09-10

### Changed

- Wired page loading indicator to all page loads!

### [2.0.0-rc.19] - 2025-09-10

### Fixed

- correct typing on resourcesPayload
- enableMultiTenant handling
- proper inject of prettier and gitignore

### [2.0.0-rc.18] - 2025-09-10

### Fixed

- Correctly use available codehooks (do not hardcode defaults)

### Changed

- Copy .prettierignore into host on install

### [2.0.0-rc.17] - 2025-09-09

### Fixed

- wired up cache bursting on css
- tidy up on custom codehooks
- Configure Code Hook button now works regardless of tool mode
- pass resourcesPayload from backend

### [2.0.0-rc.16] - 2025-09-09

### Fixed

- Small layout glitch in edit.astro
- Another layout glitch on Add Panel

### Changed

- Always generate tailwind on save

### [2.0.0-rc.15] - 2025-09-09

### Fixed

- Edit link now requires auth
- Clear session and cookies on init

### Changed

- Analytics panel condensed view on mobile

### [2.0.0-rc.14] - 2025-09-09

### Fixed

- Fixed sysop panel for real

### Fixed

- Fixed dropdown positioning and overflow issues in ViewportComboBox component
- Improved time validation logic in EpinetDurationSelector (changed `<=` to `<` for end time comparison)
- Added proper overflow handling for dashboard analytics sections
- Enhanced class extraction algorithm in nodes store to include all descendant nodes when traversing dirty node trees
- Added viewport change notifications to trigger coordinated re-renders

### Added

- Added `useDropdownDirection` utility for intelligent dropdown positioning
- Added responsive padding classes for consistent mobile/desktop layouts across StoryKeep pages
- Added max-width constraints and proper container sizing for better content layout

### Changed

- Improved code formatting and consistency across template literals in multiple components
- Enhanced sticky bottom bar styling with better conditional class formatting
- Updated all StoryKeep pages to use consistent responsive padding (`p-3.5 md:p-8`)
- Refactored getDirtyNodesClassData method to properly traverse node hierarchies for class extraction

### [2.0.0-rc.12] - 2025-09-08

### Fixed

- updated packages

### [2.0.0-rc.11] - 2025-09-08

### Fixed

- correct initial frontend.css; better tailwind output for gen
- removed unnecessary bottom padding on consumers of UnsavedChangesBar, except the RegistrationForm
- correct url for create menu in SiteWizard
- proper detection of createMenu mode
- made SiteWizard responsively use fullContentMap

### [2.0.0-rc.10] - 2025-09-08

### Fixed

- proper listener for sysop panel

### [2.0.0-rc.9] - 2025-09-07

### Fixed

- added proper bottom padding on RegistrationForm and all consumers of UnsavedChangesBar
- ensured correct usage of PUBLIC_ENABLE_MULTI_TENANT in create-tractstack

### [2.0.0-rc.8] - 2025-09-04

### Fixed

- Epinet visualization issues
- proper permissions

### [2.0.0-rc.7] - 2025-09-04

### Fixed

- mobile layout panel overlap

### Changed

- updated footer text
- added rounded to base designs

### [2.0.0-rc.6] - 2025-09-04

### Fixed

- loading indicator >90 race glitch
- sane install defaults
- correctly wired Add style panel
- quality of life + styles small touches

### [2.0.0-rc.5] - 2025-09-04

### Fixed

- bootstrapped proper brand assets + initial css

### [2.0.0-rc.4] - 2025-09-03

### Fixed

- multi-tenant detection during install

### Changed

- tidy up build script messages

### [2.0.0-rc.3] - 2025-09-02

### Fixed

- using `latest` tag

# [2.0.0-rc.2] - 2025-09-02

### Fixed

- Major tune-up to run off localhost via install script!

## [2.0.0-rc.1] - 2025-08-28

### Fixed

- Fixed authentication in `/api/tailwind` endpoint to properly forward user cookies instead of using hardcoded admin password, resolving CSS generation failures during save process
- Added year range on the Footer copyright

### Changed

- Don't ask tenant ID during init unless multi-tenant mode

## [2.0.0-rc.0] - 2025-08-27

### Changed

- Complete port of TractStack to Go backend architecture. All features from legacy version now available with thin client Astro frontend and Go backend integration.

[2.0.0-rc.1]: https://github.com/AtRiskMedia/astro-tractstack/releases/tag/v2.0.0-rc.1
[2.0.0-rc.0]: https://github.com/AtRiskMedia/astro-tractstack/releases/tag/v2.0.0-rc.0
