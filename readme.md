# Home Build Budget & Material Delivery Tracker

Simple web app to track:

- Target budget line items (based on the provided "TARGET BUDGET").
- Two pie charts (Max Budget: 654,675.68 and Target Budget: 508,784.25) showing cost to date vs remaining/over-budget amounts.
- Actual cost to date and final cost for each line item.
- Paid-in-full status for each line item.
- Company/vendor used per line item.
- Top-of-page monthly loan-interest tracker (month + amount entries), stored separately and not compared against budget pies.
- Material delivery status list auto-seeded from budget line items that include materials.

## Run locally

Open `index.html` directly in your browser, or serve the folder:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Notes

- Data is saved in browser `localStorage` under `homebuild-tracker-v1`.
- The reset button clears only entered budget fields (actual/final/paid/company) and keeps target budget values.
