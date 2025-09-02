# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-rc.2] - 2025-09-02

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
