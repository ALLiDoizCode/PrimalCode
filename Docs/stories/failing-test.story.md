# Story: Fix Pre-existing Test Failures (Quality Assurance)

## Status
Pending Implementation

## Story
**As a** development team,
**I want** to fix the 2 pre-existing test failures that are unrelated to Story 2.1 but are blocking test suite integrity,
**so that** the codebase maintains its quality standards and all tests pass consistently.

## Context and Background
Following the completion of Story 2.1 (Single AO Monster Process Implementation), the test suite shows 234/236 tests passing with 2 pre-existing test failures that were not introduced by Story 2.1 but need to be addressed to maintain codebase quality:

1. **BuildShelterTool Test Failure (tests/unit/tools/build-shelter.test.ts:132)**
   - Test: `should record token transaction correctly`
   - Error: `Cannot build shelter: Too close to existing structures. Minimum 50 units distance required.`
   - Root Cause: Test is attempting to build a shelter at location (500, 500) when a previous test already placed a shelter at the same location, violating the 50-unit minimum distance requirement.

2. **EcosystemObserverTool Test Failure (tests/unit/tools/ecosystem-observer.test.ts:279)**
   - Test: `should provide default suggestions when no specific conditions detected`
   - Error: Test expects suggested actions to contain specific text patterns but they don't match
   - Root Cause: The default suggestion text returned by `generateSuggestedActions()` is "Continue observing ecosystem for behavioral patterns" but the test is looking for partial matches that may not exist.

These failures represent test isolation issues and assertion mismatch problems that need to be resolved to maintain test suite integrity.

## Acceptance Criteria
1. BuildShelterTool test failure resolved - all shelter building tests pass consistently
2. EcosystemObserverTool test failure resolved - suggestion text assertions match actual output
3. No new test failures introduced during fixes
4. Test isolation properly maintained between test cases
5. All 236 tests in the suite pass consistently

## Tasks / Subtasks
- [ ] Fix BuildShelterTool test isolation issue (AC: 1, 4)
  - [ ] Analyze shelter placement test order and coordinate conflicts
  - [ ] Implement proper test isolation by resetting environment state between tests
  - [ ] Modify test coordinates to ensure proper spacing between shelter placements
  - [ ] Verify 50-unit distance requirement is respected across all shelter tests
  - [ ] Run BuildShelterTool test suite independently to confirm fix
- [ ] Fix EcosystemObserverTool suggestion text assertion (AC: 2)
  - [ ] Analyze actual suggestion text output from `generateSuggestedActions()` method
  - [ ] Review the default suggestion logic in ecosystem-observer.ts line 213
  - [ ] Update test assertions to match actual default suggestion text patterns
  - [ ] Verify suggestion text generation covers expected default cases
  - [ ] Run EcosystemObserverTool test suite independently to confirm fix
- [ ] Validate test suite integrity after fixes (AC: 3, 5)
  - [ ] Run complete test suite to ensure no new failures introduced
  - [ ] Verify all 236 tests pass consistently across multiple runs
  - [ ] Check test execution order independence for affected test files
  - [ ] Validate that fixes don't affect other test cases in the same files
  - [ ] Document any changes made to test logic or assertions

## Dev Notes

### Current Test Status
**Test Suite:** 234/236 tests passing
**Failures:**
1. `tests/unit/tools/build-shelter.test.ts` - "should record token transaction correctly"
2. `tests/unit/tools/ecosystem-observer.test.ts` - "should provide default suggestions when no specific conditions detected"

### Root Cause Analysis

#### BuildShelterTool Test Failure
**Location:** `tests/unit/tools/build-shelter.test.ts:132`
**Test Name:** `should record token transaction correctly`
**Error Message:** `Cannot build shelter: Too close to existing structures. Minimum 50 units distance required.`

**Root Cause:**
The test is failing because it's trying to build a shelter at the default `validRequest` location (500, 500), but a previous test in the same file has already placed a shelter at that exact location. The BuildShelterTool enforces a 50-unit minimum distance between structures (implemented in src/tools/build-shelter.ts:65-75).

**Fix Strategy:**
- Use unique coordinates for each test to prevent overlap
- Ensure proper test isolation by resetting environment state
- Modify the failing test to use a different location

#### EcosystemObserverTool Test Failure
**Location:** `tests/unit/tools/ecosystem-observer.test.ts:279`
**Test Name:** `should provide default suggestions when no specific conditions detected`
**Error Message:** `expect(received).toBeTruthy() Received: false`

**Root Cause:**
The test expects `result.suggestedActions` to contain text matching one of these patterns:
- "Continue observing ecosystem"
- "Continue observing" 
- "observing"
- "behavioral patterns"

However, the actual default suggestion returned by `generateSuggestedActions()` (line 213 in ecosystem-observer.ts) is:
`"Continue observing ecosystem for behavioral patterns"`

The test assertion is checking for exact substring matches but may not be finding them due to case sensitivity or exact text variations.

**Fix Strategy:**
- Examine the actual suggestion text output
- Update test assertions to match the actual default text
- Ensure the test properly handles the default case scenario

### File Locations
- **BuildShelterTool Source:** `src/tools/build-shelter.ts`
- **BuildShelterTool Tests:** `tests/unit/tools/build-shelter.test.ts`
- **EcosystemObserverTool Source:** `src/tools/ecosystem-observer.ts`
- **EcosystemObserverTool Tests:** `tests/unit/tools/ecosystem-observer.test.ts`

### Technical Constraints
- **Test Framework:** Jest with TypeScript
- **Test Isolation:** Each test should run independently without state leakage
- **Mock Environment:** Tests use MockEnvironmentState for isolation
- **Token System:** BuildShelterTool uses PrimalTokenService for token validation

### Expected Changes
This story should only involve:
1. **Test file modifications** - No source code changes to tool implementations
2. **Test isolation improvements** - Better environment state reset between tests
3. **Assertion updates** - Matching test expectations to actual output
4. **No functional changes** - Tool behavior should remain exactly the same

## Testing
### Testing Standards
**Test File Locations:**
- `tests/unit/tools/build-shelter.test.ts` - Target failing test at line 132
- `tests/unit/tools/ecosystem-observer.test.ts` - Target failing test at line 279

**Test Validation:**
- All BuildShelterTool tests (17 tests) must pass
- All EcosystemObserverTool tests (16 tests) must pass
- Complete test suite must show 236/236 tests passing
- Test execution order independence verified

**Success Criteria:**
- Zero test failures in complete test suite run
- Consistent test results across multiple executions
- No regression in previously passing tests

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-07-16 | 1.0 | Initial story created to address pre-existing test failures | BMad Create Next Story Task |

## QA Results
*To be filled during implementation*

**Pre-Implementation Status:** 234/236 tests passing
**Target Status:** 236/236 tests passing
**Scope:** Test fixes only, no functional code changes required