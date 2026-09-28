# Goals — UAR inference and liter-llm model routing

- Make an agent created with the UAR runtime choose an executable inference model, with liter-llm served models available from the configured gateway.
- Let an existing UAR agent repair or change its inference assignment without recreating the agent.
- Keep the visible model and the model actually sent to UAR consistent, and explain unavailable credentials or gateway connections before a run.
- Exercise one real installed-app inference path after the complete Boss change and local Apple Silicon build; preserve the active 2.2.7 release publication work.
