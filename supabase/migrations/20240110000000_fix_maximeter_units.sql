-- Datadis returns max_power in kW, but previous sync code divided by 1000
-- treating it as Watts. This migration corrects existing rows stored 1000x too small.
UPDATE maximeter
SET max_power_kw = max_power_kw * 1000
WHERE max_power_kw < 0.5;
