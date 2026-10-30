# 14H36-38 acceptance

14H36: `npm run test:migration` now executes under the clinical-foundation workflow. Verify that the CI job actually completes; committed tests alone are not a passed run.

14H37: Verify the live public release commit and manually test authenticated search, paired genotypes, evidence expansion, keyboard return focus, mobile layout and error retry. The site could not be reached from this session, so production acceptance is not confirmed.

14H38: Run the offline source audit using de-identified original variant profiles. A report with `reviewRequired=true`, including an empty input, requires further investigation; preserve original Class I exceptions and the independence of ETI and Alyftrek. No geography events or scientific writes are enabled.
