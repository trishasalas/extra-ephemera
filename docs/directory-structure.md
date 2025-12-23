plant-app/
├── server.js                 # Entry point - clean and minimal
├── package.json
├── .env                      # For any config (PORT, etc)
├── database/
│   ├── db.js                # Database connection/setup
│   ├── schema.sql           # Table definitions
│   └── migrations/          # For future schema changes
│       └── 001_initial.sql
├── src/
│   ├── routes/              # Route handlers
│   │   ├── plants.js
│   │   ├── journal.js
│   │   └── api.js
│   ├── models/              # Data access layer
│   │   ├── plant.js
│   │   ├── journalEntry.js
│   │   └── careLog.js
│   ├── services/            # Business logic
│   │   ├── plantService.js
│   │   └── reminderService.js
│   └── utils/               # Shared utilities
│       └── dates.js
├── public/                  # Static files served directly
│   ├── css/
│   │   ├── main.css
│   │   └── components/     # Component-specific styles
│   ├── js/
│   │   ├── app.js
│   │   └── modules/        # Separate JS modules
│   │       ├── plantForm.js
│   │       └── journal.js
│   ├── images/
│   └── uploads/            # Plant photos
└── views/                   # HTML templates
├── layouts/
│   └── main.html
├── pages/
│   ├── home.html
│   ├── plant-detail.html
│   └── journal.html
└── partials/            # Reusable chunks
├── plant-card.html
└── nav.html
