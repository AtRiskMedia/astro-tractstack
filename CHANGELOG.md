# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
