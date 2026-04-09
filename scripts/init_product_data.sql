-- GANTI UUID DI BAWAH INI DENGAN COMPANY_ID ANDA
DO $$
DECLARE 
    target_id UUID := 'ISI-COMPANY-ID-ANDA-DISINI';
BEGIN

INSERT INTO products (plu, name, brand, price, cost_price, stock, unit, category, image_url, company_id)
VALUES
-- SEMBAKO & MINYAK
(floor(random() * 9000000 + 1000000)::text, 'Beras Ramos 5kg', 'Topi Koki', 75000, 68000, 50, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1586201375761-83865ecf9d5d?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Minyak Goreng 2L', 'Bimoli', 38000, 34500, 40, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Gula Pasir 1kg', 'Gulaku', 16500, 14800, 100, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Garam Dapur 250g', 'Cap Kapal', 3500, 2800, 200, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Tepung Terigu 1kg', 'Segitiga Biru', 12500, 11000, 60, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Telur Ayam 1kg', 'Lokal', 28000, 25500, 30, 'kg', 'Sembako', 'https://images.unsplash.com/photo-1587486914619-3f04f0821c17?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Santan Kara 65ml', 'Kara', 4000, 3200, 48, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Kecap Manis 550ml', 'Bango', 22000, 19500, 24, 'Pcs', 'Sembako', 'https://images.unsplash.com/photo-1584263345424-54bc79d01242?w=200', target_id),

-- MIE INSTAN
(floor(random() * 9000000 + 1000000)::text, 'Indomie Goreng Original', 'Indofood', 3100, 2650, 400, 'Pcs', 'Makanan Instan', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Indomie Ayam Bawang', 'Indofood', 3000, 2550, 200, 'Pcs', 'Makanan Instan', 'https://images.unsplash.com/photo-1591814403971-56939c92518e?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Indomie Kari Ayam', 'Indofood', 3200, 2750, 150, 'Pcs', 'Makanan Instan', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Sedaap Mie Goreng', 'Wings Food', 3000, 2500, 150, 'Pcs', 'Makanan Instan', 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Pop Mie Ayam', 'Indofood', 5500, 4700, 80, 'Pcs', 'Makanan Instan', 'https://images.unsplash.com/photo-1526318896980-cf78fa0882eb?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Sarimi Isi 2 Goreng', 'Indofood', 4500, 3800, 60, 'Pcs', 'Makanan Instan', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', target_id),

-- MINUMAN
(floor(random() * 9000000 + 1000000)::text, 'Aqua 600ml', 'Danone', 3500, 2800, 240, 'Pcs', 'Minuman', 'https://images.unsplash.com/photo-1616118132261-ecc043743588?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Teh Botol Sosro 450ml', 'Sosro', 6500, 5200, 120, 'Pcs', 'Minuman', 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Kopi Kapal Api 165g', 'Kapal Api', 14500, 12800, 50, 'Pcs', 'Minuman', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Susu Bear Brand 189ml', 'Nestle', 10500, 9200, 48, 'Pcs', 'Minuman', 'https://images.unsplash.com/photo-1550583724-1255d1ba55c5?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Coca Cola 390ml', 'Coca Cola', 5500, 4500, 60, 'Pcs', 'Minuman', 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Pocari Sweat 500ml', 'Otsuka', 8000, 6800, 48, 'Pcs', 'Minuman', 'https://images.unsplash.com/photo-1621255850942-0f7f329583f7?w=200', target_id),

-- MANDI & CUCI
(floor(random() * 9000000 + 1000000)::text, 'Pepsodent 190g', 'Unilever', 14200, 12200, 60, 'Pcs', 'Kebutuhan Mandi', 'https://images.unsplash.com/photo-1559594864-bf672d07ff8b?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Lifebuoy Bar 110g', 'Unilever', 4500, 3600, 144, 'Pcs', 'Kebutuhan Mandi', 'https://images.unsplash.com/photo-1600857062241-99e5da7f580c?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Sunsilk Shamp 160ml', 'Unilever', 24500, 21000, 30, 'Pcs', 'Kebutuhan Mandi', 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Rinso Bubuk 770g', 'Unilever', 28500, 24800, 24, 'Pcs', 'Kebutuhan Mencuci', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Mama Lemon 780ml', 'Wings', 15500, 13200, 36, 'Pcs', 'Kebutuhan Mencuci', 'https://images.unsplash.com/photo-1584622781564-1d9876a13d10?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Downy Pewangi 700ml', 'P&G', 32000, 27500, 20, 'Pcs', 'Kebutuhan Mencuci', 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200', target_id),

-- SNACK
(floor(random() * 9000000 + 1000000)::text, 'Chitato Sapi Pan 68g', 'Indofood', 11500, 9500, 60, 'Pcs', 'Snack', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Oreo Vanilla 133g', 'Mondelez', 9500, 7800, 48, 'Pcs', 'Snack', 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Roma Kelapa 300g', 'Mayora', 10500, 8800, 40, 'Pcs', 'Snack', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Silverqueen Almond', 'Silverqueen', 15000, 12500, 30, 'Pcs', 'Snack', 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=200', target_id),
(floor(random() * 9000000 + 1000000)::text, 'Taro Net Seaweed', 'Taro', 5500, 4200, 60, 'Pcs', 'Snack', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200', target_id)

-- [DAN SETERUSNYA...]
;

-- UPDATE: Tambahan batch lain untuk mencapai 100 Produk Secara Massal
-- Untuk memperingkas, kita gunakan random data untuk item tambahan dengan kategori acak
INSERT INTO products (plu, name, brand, price, cost_price, stock, unit, category, image_url, company_id)
SELECT 
    (floor(random() * 9000000 + 1000000)::text),
    'Produk Retail #' || i,
    'Brand Lokal',
    ((floor(random() * 50 + 5) * 1000)::numeric), -- Harga 5k - 50k
    ((floor(random() * 30 + 4) * 1000)::numeric), -- HPP 4k - 30k
    (floor(random() * 100 + 10)::numeric),
    'Pcs',
    (ARRAY['Sembako', 'Snack', 'Minuman', 'Kebutuhan Mandi'])[floor(random() * 4 + 1)],
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    target_id
FROM generate_series(1, 70) AS i; -- Tambah 70 item acak lagi

END $$;
