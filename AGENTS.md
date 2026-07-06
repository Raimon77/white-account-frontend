# White Account Frontend Rules

## Project Context

White Account is a commercial management app for shops, SMBs, and small companies. It manages clients, suppliers, products, purchases, sales, payments, quotes, customer orders, refunds, expenses, closings, dashboard data, and PDF documents.

Current frontend stack:
- React
- Vite
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- axios
- react-router-dom

## Frontend Rules

1. Keep the frontend in TypeScript.
2. Use `.tsx` for pages and components.
3. Use `.ts` for helpers, API files, and types.
4. Do not write JavaScript frontend files.
5. Do not break the validated general design.
6. Do not modify the backend from this folder.
7. Read files before editing.
8. Make progressive, testable changes.
9. Keep the interface professional, modern, and suitable for shops, SMBs, and companies.

## Validated Design

- Professional SaaS style.
- Navy sidebar.
- Light background.
- White cards.
- Professional blue buttons.
- Orange accents for alerts, refunds, and remaining balance.
- Green for paid and success states.
- Red for errors and destructive actions.
- lucide-react icons.

Palette:
- Navy: `#0F172A`
- Main blue: `#2563EB`
- Light background: `#F8FAFC`
- White card: `#FFFFFF`
- Success green: `#16A34A`
- Danger red: `#DC2626`
- Alert orange: `#F97316`
- Main text: `#0F172A`
- Secondary text: `#64748B`

## Business Rules

1. Product price is a default price.
2. In a sale, the sale price must be editable per line.
3. Profit = `(applied price - purchase cost) * quantity`.
4. Users must be able to edit or delete records to correct mistakes.
5. Dangerous actions must request confirmation.
6. After edit/delete, reload data.
7. Backend errors must be displayed clearly when available.

## API

Base URL is normally configured in `src/api/api.ts`:
`http://localhost:5000/api`

Important routes:
- `GET/POST/PUT/DELETE /clients`
- `GET/POST/PUT/DELETE /products`
- `GET/POST/PUT/DELETE /suppliers`
- `GET/POST/PUT/DELETE /purchases`
- `GET/POST/PUT/DELETE /sales`
- `POST /sales/:id/invoice-pdf`
- `/sale-payments`
- `/sale-refunds`
- `/quotes`
- `/customer-orders`
- `/expenses`
- `/closings`
- `/dashboard`

## Current Priority

1. Do not touch the backend.
2. Verify the Sales module shows: View, Edit, Delete, PDF.
3. Verify the invoice PDF button opens the PDF returned by the backend.
4. Improve error display to show the exact backend message when available.
5. Then continue with the Payments module in TypeScript.

Test command:
`npm run dev`
