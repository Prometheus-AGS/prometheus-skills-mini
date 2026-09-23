# Goals — the-boss-shipping-and-settings› uar-working-agent

- Deliver P1 as an installed UAR agent across The Boss and UAR, with Windows x64 first and Apple Silicon second
- Reconcile and preserve existing Boss and UAR worktree changes before assigning writers
- Implement the trusted run envelope, principal isolation, host-owned MCP approvals, AG-UI adaptation, durable history recovery, and no-Docker local startup
- Package Compass, Rust filesystem MCP, mini skills, UAR, and all required native/runtime assets through the existing binary manager
- Run one complete installed integration gate only after P1 production wiring is complete; publish accepted customer artifacts immediately
- Maintain the outcome ledger and make no completion claim before observed installed acceptance
