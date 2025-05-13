# Slack Notification Templates

This document contains templates for Slack notifications related to the Enhanced Pre-Release Development Workflow.

## Channel Structure

- `#project-[project-name]`: Main channel for project discussions
- `#[project-name]-planning`: Planning stage discussions
- `#[project-name]-setup`: Setup stage discussions
- `#[project-name]-tdd`: TDD stage discussions
- `#[project-name]-testing`: Testing stage discussions
- `#[project-name]-organization`: Organization stage discussions
- `#[project-name]-pre-release`: Pre-release stage discussions
- `#[project-name]-notifications`: Automated notifications from GitHub, Linear, and Notion

## GitHub Notification Templates

### Pull Request Created

```
:github: *New Pull Request*: <[PR URL]|[PR Title]>
*Author*: [Author]
*Description*: [Description]
*Stage*: [Stage]
```

### Pull Request Updated

```
:github: *Pull Request Updated*: <[PR URL]|[PR Title]>
*Author*: [Author]
*Changes*: [Changes]
```

### Pull Request Merged

```
:github: *Pull Request Merged*: <[PR URL]|[PR Title]>
*Author*: [Author]
*Merged by*: [Merger]
```

### Issue Created

```
:github: *New Issue*: <[Issue URL]|[Issue Title]>
*Author*: [Author]
*Description*: [Description]
*Stage*: [Stage]
```

### Issue Closed

```
:github: *Issue Closed*: <[Issue URL]|[Issue Title]>
*Closed by*: [Closer]
*Resolution*: [Resolution]
```

### CI/CD Status

```
:github: *CI/CD Status*: [Status]
*Repository*: [Repository]
*Branch*: [Branch]
*Workflow*: [Workflow]
*Details*: <[Details URL]|View Details>
```

## Linear Notification Templates

### Issue Created

```
:linear: *New Issue*: <[Issue URL]|[Issue Title]>
*Author*: [Author]
*Description*: [Description]
*Stage*: [Stage]
```

### Issue Updated

```
:linear: *Issue Updated*: <[Issue URL]|[Issue Title]>
*Updated by*: [Updater]
*Changes*: [Changes]
```

### Issue Status Changed

```
:linear: *Issue Status Changed*: <[Issue URL]|[Issue Title]>
*Changed by*: [Changer]
*Old Status*: [Old Status]
*New Status*: [New Status]
```

## Notion Notification Templates

### Document Created

```
:notion: *New Document*: <[Document URL]|[Document Title]>
*Author*: [Author]
*Type*: [Type]
*Stage*: [Stage]
```

### Document Updated

```
:notion: *Document Updated*: <[Document URL]|[Document Title]>
*Updated by*: [Updater]
*Changes*: [Changes]
```

## Daily Standup Template

```
:calendar: *Daily Standup*: [Date]

*Yesterday*:
- [Task 1]
- [Task 2]
- [Task 3]

*Today*:
- [Task 1]
- [Task 2]
- [Task 3]

*Blockers*:
- [Blocker 1]
- [Blocker 2]
- [Blocker 3]
```

## Weekly Progress Template

```
:chart_with_upwards_trend: *Weekly Progress Report*: [Week]

*Completed*:
- [Task 1]
- [Task 2]
- [Task 3]

*In Progress*:
- [Task 1]
- [Task 2]
- [Task 3]

*Planned*:
- [Task 1]
- [Task 2]
- [Task 3]

*Blockers*:
- [Blocker 1]
- [Blocker 2]
- [Blocker 3]

*Metrics*:
- Test Coverage: [Coverage]
- Open Issues: [Open Issues]
- Closed Issues: [Closed Issues]
```

## Stage Transition Template

```
:rocket: *Stage Transition*: [Old Stage] -> [New Stage]
*Project*: [Project]
*Component*: [Component]
*Details*: [Details]
*Next Steps*: [Next Steps]
```

## Decision Record Template

```
:bulb: *Decision Record*: [Decision Title]
*Context*: [Context]
*Decision*: [Decision]
*Consequences*: [Consequences]
*Related Links*: [Links]
```
