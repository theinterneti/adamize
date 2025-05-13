# GitHub Project Board Template

This template describes how to set up a GitHub project board for the Enhanced Pre-Release Development Workflow.

## Board Name

[Project Name] Development Board

## Description

Project board for tracking the development of [Project Name] using the Enhanced Pre-Release Development Workflow.

## Columns

1. **Backlog**
   - Description: Issues that have been created but not yet started
   - Automation: None

2. **Planning and Requirements**
   - Description: Issues in the planning and requirements stage
   - Automation: 
     - Move issues with label `stage:planning` here when added to the project

3. **Setup and Initial Structure**
   - Description: Issues in the setup and initial structure stage
   - Automation:
     - Move issues with label `stage:setup` here when added to the project

4. **Test-Based Development Loop**
   - Description: Issues in the TDD loop
   - Automation:
     - Move issues with label `stage:tdd` here when added to the project

5. **Advanced Testing and Refinement**
   - Description: Issues in the advanced testing stage
   - Automation:
     - Move issues with label `stage:testing` here when added to the project

6. **Code Organization and Documentation**
   - Description: Issues in the code organization stage
   - Automation:
     - Move issues with label `stage:organization` here when added to the project

7. **Pre-Release Finalization**
   - Description: Issues in the pre-release stage
   - Automation:
     - Move issues with label `stage:pre-release` here when added to the project

8. **Done**
   - Description: Issues that have been completed
   - Automation:
     - Move issues here when closed

## Labels

- `stage:planning`: Issues in the planning and requirements stage
- `stage:setup`: Issues in the setup and initial structure stage
- `stage:tdd`: Issues in the test-based development loop
- `stage:testing`: Issues in the advanced testing stage
- `stage:organization`: Issues in the code organization stage
- `stage:pre-release`: Issues in the pre-release finalization stage
- `type:feature`: Feature implementation
- `type:bug`: Bug fix
- `type:documentation`: Documentation update
- `priority:high`: High priority
- `priority:medium`: Medium priority
- `priority:low`: Low priority

## Automation Rules

1. **Move to Planning**
   - Trigger: Issue labeled with `stage:planning`
   - Action: Move to "Planning and Requirements" column

2. **Move to Setup**
   - Trigger: Issue labeled with `stage:setup`
   - Action: Move to "Setup and Initial Structure" column

3. **Move to TDD**
   - Trigger: Issue labeled with `stage:tdd`
   - Action: Move to "Test-Based Development Loop" column

4. **Move to Testing**
   - Trigger: Issue labeled with `stage:testing`
   - Action: Move to "Advanced Testing and Refinement" column

5. **Move to Organization**
   - Trigger: Issue labeled with `stage:organization`
   - Action: Move to "Code Organization and Documentation" column

6. **Move to Pre-Release**
   - Trigger: Issue labeled with `stage:pre-release`
   - Action: Move to "Pre-Release Finalization" column

7. **Move to Done**
   - Trigger: Issue closed
   - Action: Move to "Done" column
