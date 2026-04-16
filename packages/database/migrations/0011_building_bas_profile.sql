ALTER TABLE buildings ADD COLUMN bas_present TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE buildings ADD COLUMN bas_vendor TEXT;
ALTER TABLE buildings ADD COLUMN bas_protocol TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE buildings ADD COLUMN bas_access_state TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE buildings ADD COLUMN point_list_available TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE buildings ADD COLUMN schedules_available TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE buildings ADD COLUMN ventilation_system_archetype TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE buildings ADD COLUMN equipment_inventory_status TEXT NOT NULL DEFAULT 'unknown';
