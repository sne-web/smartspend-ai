"""
Generates a synthetic (merchant, description, category) dataset for training
the transaction-categorization model.

Deliberately NOT trivially easy: several merchants appear under more than one
category depending on the accompanying description (e.g. "Netflix" is a Bills
row when framed as a subscription payment, but an Entertainment row when framed
as a night of streaming). A classifier that only looks at the merchant name
will get these wrong; it has to weigh the description text too, same as a real
bank-statement categorizer would.

Run: python seed_data.py   (writes ./data/seed_transactions.csv)
"""

import csv
import random
from pathlib import Path

random.seed(42)

CATEGORIES = [
    "Food",
    "Shopping",
    "Transport",
    "Bills",
    "Healthcare",
    "Entertainment",
    "Education",
    "Others",
]

GENERIC_TEMPLATES = [
    "Payment to {merchant}",
    "POS purchase at {merchant}",
    "Purchase - {merchant}",
    "{merchant} - card transaction",
    "Debit card purchase: {merchant}",
]

# category -> (merchants, description templates specific to that category)
CATEGORY_DATA = {
    "Food": (
        ["Whole Foods", "Trader Joe's", "Starbucks", "McDonald's", "Chipotle",
         "Local Diner", "Panera Bread", "Domino's Pizza", "Kroger", "Safeway",
         "Olive Garden", "Subway", "Dunkin'"],
        [
            "Grocery purchase at {merchant}",
            "Lunch at {merchant}",
            "Coffee run - {merchant}",
            "Dinner with friends at {merchant}",
            "Weekly grocery shopping - {merchant}",
            "Fast food order - {merchant}",
        ],
    ),
    "Shopping": (
        ["Amazon", "Target", "Walmart", "Best Buy", "Nike", "H&M", "Etsy",
         "eBay", "IKEA", "Nordstrom", "Costco", "Old Navy", "Macy's"],
        [
            "Online order - {merchant}",
            "AMZN MKTP US - {merchant}",
            "{merchant} - clothing purchase",
            "Electronics purchase at {merchant}",
            "Home goods - {merchant}",
            "Retail purchase at {merchant}",
        ],
    ),
    "Transport": (
        ["Uber", "Lyft", "Shell", "Chevron", "Metro Transit", "Delta Airlines",
         "Enterprise Rent-A-Car", "City Parking Garage", "Amtrak", "Toll Road Authority"],
        [
            "Ride to airport - {merchant}",
            "Gas station fill-up - {merchant}",
            "Monthly transit pass - {merchant}",
            "Flight booking - {merchant}",
            "Car rental - {merchant}",
            "Parking fee - {merchant}",
            "Ride home - {merchant}",
        ],
    ),
    "Bills": (
        ["Comcast Xfinity", "City Power & Water", "AT&T", "Verizon",
         "State Farm Insurance", "Mortgage Servicer", "Property Management Co",
         "Netflix", "Spotify", "Water Utility Dept"],
        [
            "Monthly subscription payment - {merchant}",
            "Utility bill payment - {merchant}",
            "{merchant} - autopay",
            "Insurance premium - {merchant}",
            "Rent payment via {merchant}",
            "Recurring bill - {merchant}",
        ],
    ),
    "Healthcare": (
        ["CVS Pharmacy", "Walgreens", "City Medical Clinic", "Dental Care Associates",
         "Vision Center", "Urgent Care Clinic", "Blue Cross Insurance", "Physical Therapy Center"],
        [
            "Prescription pickup - {merchant}",
            "Doctor visit copay - {merchant}",
            "Dental cleaning - {merchant}",
            "Eye exam - {merchant}",
            "Health insurance premium - {merchant}",
            "Urgent care visit - {merchant}",
        ],
    ),
    "Entertainment": (
        ["Netflix", "Spotify", "AMC Theatres", "Steam", "PlayStation Store",
         "Ticketmaster", "Bowling Alley", "Local Cinema"],
        [
            "Movie night - {merchant}",
            "Concert tickets - {merchant}",
            "Video game purchase - {merchant}",
            "Streaming - {merchant}",
            "Weekend outing - {merchant}",
            "{merchant} - fun night out",
        ],
    ),
    "Education": (
        ["Coursera", "Udemy", "University Tuition Office", "Campus Bookstore",
         "Amazon", "Student Loan Servicer", "School Supplies Store"],
        [
            "Online course - {merchant}",
            "Tuition payment - {merchant}",
            "Textbook purchase - {merchant}",
            "Student loan payment - {merchant}",
            "School supplies - {merchant}",
            "Certification exam fee - {merchant}",
        ],
    ),
    "Others": (
        ["ATM", "Bank", "Venmo", "Unknown Merchant", "Local Charity",
         "Gift Shop", "PayPal Transfer", "Cash App"],
        [
            "ATM withdrawal - {merchant}",
            "Bank service fee - {merchant}",
            "Transfer via {merchant}",
            "Cash deposit - {merchant}",
            "Charitable donation - {merchant}",
            "Gift purchase - {merchant}",
            "Miscellaneous payment - {merchant}",
        ],
    ),
}

# Deliberate cross-category ambiguity: same merchant, different category,
# depending on how the transaction reads. This is what keeps the task honest -
# a model that just memorizes "merchant -> category" will fail these.
AMBIGUOUS_ROWS = [
    ("Uber Eats", "Food delivery order - Uber Eats", "Food"),
    ("Uber Eats", "Dinner delivery - Uber Eats", "Food"),
    ("Amazon", "AMZN MKTP US - textbook for CS101", "Education"),
    ("Amazon", "Amazon - course materials for class", "Education"),
    ("CVS Pharmacy", "Snacks and cosmetics run - CVS Pharmacy", "Shopping"),
    ("Walgreens", "Toiletries and candy - Walgreens", "Shopping"),
    ("Costco", "Grocery run - Costco", "Food"),
    ("Costco", "Bulk household items - Costco", "Shopping"),
    ("Target", "Grocery pickup - Target", "Food"),
    ("Target", "Target - home decor purchase", "Shopping"),
    ("Netflix", "Netflix - movie night", "Entertainment"),
    ("Spotify", "Spotify - music while working out", "Entertainment"),
    ("Walmart", "Walmart - weekly grocery haul", "Food"),
    ("Walmart", "Walmart - new lamp and towels", "Shopping"),
]


def generate_rows() -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []

    for category in CATEGORIES:
        merchants, templates = CATEGORY_DATA[category]
        # A handful of rows per merchant, mixing category-specific phrasing
        # with generic phrasing so the model sees both styles.
        for merchant in merchants:
            for _ in range(2):
                template = random.choice(templates + GENERIC_TEMPLATES)
                rows.append((merchant, template.format(merchant=merchant), category))

    rows.extend(AMBIGUOUS_ROWS)

    random.shuffle(rows)
    return rows


def main() -> None:
    rows = generate_rows()

    out_dir = Path(__file__).parent / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "seed_transactions.csv"

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["merchant", "description", "category"])
        writer.writerows(rows)

    print(f"Wrote {len(rows)} rows to {out_path}")
    counts = {c: sum(1 for r in rows if r[2] == c) for c in CATEGORIES}
    for category, count in counts.items():
        print(f"  {category}: {count}")


if __name__ == "__main__":
    main()
