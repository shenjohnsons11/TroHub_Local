# Batch invoice utility-price implementation plan

1. Trace the preview response, contract snapshots, and landlord service defaults.
2. Add a regression check for missing legacy contract prices.
3. Resolve prices in this order: active contract snapshot, landlord utility-service default, safe platform fallback; expose quick editing in the batch modal.
4. Run the regression check, lint/build, and verify the preview payload never has a zero utility price.
