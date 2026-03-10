-- Seed data for BamaMarkets (University of Alabama)

-- Ensure UA exists
INSERT INTO universities (id, name, domain) 
VALUES ('00000000-0000-0000-0000-000000000001', 'University of Alabama', 'ua.edu')
ON CONFLICT (domain) DO NOTHING;

-- Note: In a real app, users would be created via Auth. 
-- For seeding, you would typically use the Supabase dashboard or a script that handles auth.users.

/*
EXAMPLE SEEDING INSTRUCTIONS:

1. Create a few test users in the Supabase Auth dashboard with @ua.edu emails.
2. Get their UUIDs.
3. Use the SQL below to insert sample listings for those users.

-- Sample Listings for UA
INSERT INTO listings (title, description, price, category, seller_id, university_id, image_url)
VALUES 
('Calculus 3 Textbook', 'Lightly used, no highlights. Essential for MATH 227.', 45.00, 'Textbooks', 'USER_UUID_HERE', '00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/book/800/600'),
('Dorm Mini Fridge', 'Black mini fridge, works perfectly. Great for Ridgecrest or Presidential.', 60.00, 'Dorm Items', 'USER_UUID_HERE', '00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/fridge/800/600'),
('Alabama Football Tickets vs Auburn', 'Section S-4, Row 12. Roll Tide!', 150.00, 'Tickets', 'USER_UUID_HERE', '00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/tickets/800/600'),
('IKEA Desk', 'Simple white desk, perfect for studying.', 30.00, 'Furniture', 'USER_UUID_HERE', '00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/desk/800/600'),
('Gaming Monitor 24"', '144Hz, 1ms response time. Like new.', 120.00, 'Electronics', 'USER_UUID_HERE', '00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/monitor/800/600');

RECRUITMENT STRATEGY:

1. Flyers in the Ferg (Ferguson Student Center).
2. Posts in UA Class of 2025/2026/2027 Facebook groups.
3. Instagram ads targeting Tuscaloosa area.
4. Partnership with student organizations or Greek life.
5. QR codes on tables in Lakeside or Fresh Food Co.
*/
