## ADDED Requirements

### Requirement: Native hook input reaches dispatch without hanging
The entry point SHALL deliver JSON stdin to its selected hook on Windows pipes and POSIX sockets. It SHALL stop reading these streams at EOF or the existing idle/byte bound, and SHALL preserve regular-file input delivery.

#### Scenario: Harness closes its input
- **WHEN** a harness sends a JSON payload through the platform's native child-process stdin and closes it
- **THEN** the selected hook receives the payload and its effects reflect the payload's project

#### Scenario: Harness leaves input open
- **WHEN** a harness sends a JSON payload through a Windows pipe or POSIX socket and leaves it open
- **THEN** the hook receives that payload after the idle bound and exits without waiting for EOF

#### Scenario: Empty open input
- **WHEN** the stream is never written or closed
- **THEN** the hook receives empty input and exits after the idle bound

#### Scenario: File input
- **WHEN** a JSON payload is supplied through a regular file on stdin
- **THEN** the selected hook receives the complete payload
