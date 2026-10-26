"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search, ShoppingBag, Menu, X, Sparkles, Shirt, Palette, Instagram, Facebook, Heart, Plus, Minus } from "lucide-react";

type Product = { id: number; name: string; category: string; price: number; color: string; tag?: string; image: string; };
const products: Product[] = [
  { id: 1, name: "The Everyday Linen Shirt", category: "เสื้อ", price: 890, color: "ทรายธรรมชาติ", tag: "BESTSELLER", image: "linen" },
  { id: 2, name: "Soft Structure Blazer", category: "เสื้อคลุม", price: 1890, color: "ไอวอรี่", tag: "NEW ARRIVAL", image: "blazer" },
  { id: 3, name: "Weekend Cotton Tee", category: "เสื้อ", price: 490, color: "ขาวนวล", image: "tee" },
  { id: 4, name: "Quiet Form Trousers", category: "กางเกง", price: 1190, color: "โอ๊ตมิลค์", image: "trousers" },
];
const money = (n: number) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const filtered = useMemo(() => products.filter(p => (category === "ทั้งหมด" || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())), [category, query]);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0);
  const add = (id: number) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const change = (id: number, amount: number) => setCart(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + amount) }));

  return (
    <main>
      <div className="announcement">A little more beauty in your everyday <span>✦</span> จัดส่งฟรีเมื่อซื้อครบ ฿1,500</div>
      <header className="header">
        <button className="icon-button mobile-only" aria-label="เปิดเมนู" onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
        <a className="brand" href="#" aria-label="LUMIÈRE STUDIO หน้าแรก"><span className="brand-mark">L</span><span>LUMIÈRE <small>STUDIO</small></span></a>
        <nav className={mobileMenu ? "nav nav-open" : "nav"}>
          <a href="#shop" onClick={() => setMobileMenu(false)}>เสื้อผ้า</a><a href="#design" onClick={() => setMobileMenu(false)}>ออกแบบโลโก้</a><a href="#story" onClick={() => setMobileMenu(false)}>เรื่องราวของเรา</a>
        </nav>
        <div className="header-actions">
          <label className="search-box"><Search size={17} /><input aria-label="ค้นหาสินค้า" placeholder="ค้นหาสินค้า..." value={query} onChange={e => setQuery(e.target.value)} /></label>
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label="เปิดตะกร้าสินค้า"><ShoppingBag size={20} /><span>ตะกร้า</span><b>{count}</b></button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy"><p className="eyebrow"><Sparkles size={14} /> CURATED FOR YOUR EVERYDAY</p><h1>ความเรียบง่าย<br /><em>ที่มีความหมาย</em></h1><p className="hero-desc">เสื้อผ้าที่ใส่ใจในทุกรายละเอียด และงานออกแบบที่สะท้อนตัวตนของคุณ — เพราะสไตล์ที่ดี เริ่มจากสิ่งที่เป็นคุณ</p><div className="hero-actions"><a className="button button-dark" href="#shop">ค้นพบคอลเลกชัน <ArrowRight size={17} /></a><a className="text-link" href="#design">บริการออกแบบโลโก้</a></div><div className="hero-note"><span>✳</span> Thoughtfully made, beautifully yours.</div></div>
        <div className="hero-art" role="img" aria-label="ภาพแฟชั่นโทนครีมและทราย"><div className="sun"></div><div className="arch arch-back"></div><div className="arch arch-front"></div><div className="fabric fabric-one"></div><div className="fabric fabric-two"></div><div className="hero-stamp">LESS, BUT<br /><i>BETTER.</i></div><div className="art-caption">THE NEUTRAL EDIT / 01</div></div>
      </section>

      <section className="trust-row"><span>DESIGNED WITH INTENTION</span><span className="trust-divider"></span><span>TIMELESS BY DESIGN</span><span className="trust-divider"></span><span>MADE FOR REAL LIFE</span></section>

      <section className="discovery-section section-wrap" aria-labelledby="discovery-title">
        <div className="discovery-intro"><p className="eyebrow"><Sparkles size={14} /> FIND YOUR NEXT FAVORITE</p><h2 id="discovery-title">ค้นพบสิ่งที่ใช่สำหรับคุณ<span>.</span></h2><p className="muted">ค้นหาเสื้อผ้าโทนมินิมอล หรือเลือกบริการออกแบบแบรนด์ในแบบของคุณ</p></div>
        <div className="discovery-panel"><label className="discovery-search"><Search size={19} /><input aria-label="ค้นหาชื่อสินค้า สี หรือประเภท" placeholder="ค้นหาสินค้า สี หรือประเภท..." value={query} onChange={e => setQuery(e.target.value)} /><span className="search-hint">ค้นหา</span></label>
          <div className="discovery-chips" aria-label="ตัวกรองสินค้า">{["ทั้งหมด", "เสื้อ", "เสื้อคลุม", "กางเกง"].map(c => <button key={c} className={category === c ? "discovery-chip selected" : "discovery-chip"} onClick={() => setCategory(c)}>{c}</button>)}<a className="discovery-service" href="#design"><Palette size={15} /> บริการออกแบบโลโก้ <ArrowRight size={14} /></a></div>
        </div>
      </section>
      <section className="category-section section-wrap" aria-labelledby="category-title">
        <div className="section-heading"><div><p className="eyebrow">EXPLORE THE STUDIO</p><h2 id="category-title">เลือกชมตามสไตล์<span>.</span></h2><p className="muted">เริ่มจากหมวดที่คุณกำลังมองหา แล้วค้นพบชิ้นที่เข้ากับทุกวันของคุณ</p></div></div>
        <div className="category-grid">
          <button className="category-tile category-tile-shirt" onClick={() => { setCategory("เสื้อ"); document.getElementById("shop")?.scrollIntoView({behavior:"smooth"}); }}><span className="category-index">01 / CLOTHING</span><span className="category-title">เสื้อและท็อปส์</span><span className="category-link">เลือกชมสินค้า <ArrowRight size={15}/></span></button>
          <button className="category-tile category-tile-layer" onClick={() => { setCategory("เสื้อคลุม"); document.getElementById("shop")?.scrollIntoView({behavior:"smooth"}); }}><span className="category-index">02 / LAYERS</span><span className="category-title">เสื้อคลุม</span><span className="category-link">เลือกชมสินค้า <ArrowRight size={15}/></span></button>
          <button className="category-tile category-tile-pants" onClick={() => { setCategory("กางเกง"); document.getElementById("shop")?.scrollIntoView({behavior:"smooth"}); }}><span className="category-index">03 / ESSENTIALS</span><span className="category-title">กางเกงและไอเท็มพื้นฐาน</span><span className="category-link">เลือกชมสินค้า <ArrowRight size={15}/></span></button>
          <a className="category-tile category-tile-design" href="#design"><span className="category-index">04 / BRAND STUDIO</span><span className="category-title">ออกแบบโลโก้ด้วย Canva</span><span className="category-link">ค้นหาแพ็กเกจ <ArrowRight size={15}/></span></a>
        </div>
      </section>

      <section className="shop-section section-wrap" id="shop">
        <div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>ชิ้นโปรดที่ใส่ได้ทุกวัน<span>.</span></h2><p className="muted">คัดสรรชิ้นเรียบง่ายที่เข้ากับคุณได้ในทุกโอกาส</p></div><a className="text-link desktop-only" href="#shop">ดูสินค้าทั้งหมด <ArrowRight size={16} /></a></div>
        <div className="filters">{["ทั้งหมด", "เสื้อ", "เสื้อคลุม", "กางเกง"].map(c => <button key={c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{c}</button>)}</div>
        <div className="product-grid">{filtered.map(p => <article className="product-card" key={p.id}><div className={`product-visual ${p.image}`}>{p.tag && <span className="product-tag">{p.tag}</span>}<button className="heart-button" aria-label={`เพิ่ม ${p.name} ในรายการโปรด`}><Heart size={17} /></button><div className="product-shape"><span></span></div><button className="quick-add" onClick={() => add(p.id)}><Plus size={16} /> เพิ่มลงตะกร้า</button></div><div className="product-meta"><div><h3>{p.name}</h3><p>{p.color}</p></div><strong>{money(p.price)}</strong></div></article>)}</div>
        {filtered.length === 0 && <p className="empty-state">ไม่พบสินค้าที่ตรงกับการค้นหา ลองใช้คำอื่นนะคะ</p>}
      </section>

      <section className="design-section" id="design"><div className="design-graphic"><div className="design-card card-a"><span>lumière</span><small>BRAND STUDIO</small></div><div className="design-card card-b"><div className="logo-sun">✳</div><span>FORM &amp; FIELD</span><small>EST. 2025</small></div><div className="design-circle">YOUR<br />NEXT<br /><i>CHAPTER</i></div></div><div className="design-copy"><p className="eyebrow"><Palette size={14} /> YOUR BRAND, BEAUTIFULLY TOLD</p><h2>ไอเดียของคุณ<br />สมควรมีตัวตนที่ชัดเจน</h2><p className="muted">ให้เราช่วยเปลี่ยนไอเดียของคุณให้เป็นภาพจำ ตั้งแต่โลโก้ที่มีเอกลักษณ์ ไปจนถึงแนวทางภาพรวมของแบรนด์ที่สวยและใช้งานได้จริง</p><ul><li>ออกแบบโลโก้ให้ตรงกับตัวตนของแบรนด์</li><li>เลือกแพ็กเกจตามงบประมาณและความต้องการ</li><li>ส่งบรีฟและติดตามสถานะงานได้เป็นขั้นตอน</li></ul><a className="button button-dark" href="mailto:hello@lumierestudio.example?subject=สอบถามบริการออกแบบโลโก้">ดูแพ็กเกจออกแบบ <ArrowRight size={17} /></a><p className="tiny-note">* ช่องทางติดต่อและระบบรับบรีฟออนไลน์จะเปิดใช้งานหลังตั้งค่าระบบจริง</p></div></section>

      <section className="quote-section" id="story"><p className="eyebrow">OUR PHILOSOPHY</p><h2>“ความหรูหราไม่จำเป็นต้องดัง<br />แค่เป็นตัวคุณอย่างดีที่สุดก็พอ”</h2><p>LUMIÈRE STUDIO — Thoughtfully curated, made to last.</p></section>
      <footer className="footer"><div className="footer-brand"><a className="brand" href="#"><span className="brand-mark">L</span><span>LUMIÈRE <small>STUDIO</small></span></a><p>ความเรียบง่ายที่มีความหมาย ในทุกวันของคุณ</p></div><div className="footer-links"><div><b>เลือกชม</b><a href="#shop">เสื้อผ้า</a><a href="#design">บริการออกแบบโลโก้</a></div><div><b>ช่วยเหลือ</b><a href="mailto:hello@lumierestudio.example">ติดต่อเรา</a><a href="#story">เกี่ยวกับเรา</a></div><div><b>ติดตามเรา</b><a href="#story"><Instagram size={16} /> Instagram</a><a href="#story"><Facebook size={16} /> Facebook</a></div></div><div className="footer-bottom"><span>© 2026 LUMIÈRE STUDIO</span><span>DESIGNED WITH INTENTION ♡</span></div></footer>

      {cartOpen && <div className="drawer-backdrop" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={e => e.stopPropagation()}><div className="drawer-heading"><div><p className="eyebrow">YOUR SELECTION</p><h2>ตะกร้าสินค้า ({count})</h2></div><button className="icon-button" onClick={() => setCartOpen(false)} aria-label="ปิดตะกร้า"><X /></button></div>{count === 0 ? <div className="cart-empty"><ShoppingBag size={32} /><p>ยังไม่มีสินค้าในตะกร้า</p><button className="button button-dark" onClick={() => setCartOpen(false)}>เลือกชมสินค้า</button></div> : <><div className="cart-items">{products.filter(p => cart[p.id]).map(p => <div className="cart-item" key={p.id}><div className={`mini-product ${p.image}`} /><div className="cart-item-info"><b>{p.name}</b><span>{money(p.price)}</span><div className="quantity"><button onClick={() => change(p.id, -1)} aria-label="ลดจำนวน"><Minus size={13} /></button><span>{cart[p.id]}</span><button onClick={() => change(p.id, 1)} aria-label="เพิ่มจำนวน"><Plus size={13} /></button></div></div></div>)}</div><div className="cart-total"><span>ยอดรวมสินค้า</span><strong>{money(total)}</strong></div><button className="button button-dark checkout-button" onClick={() => alert("นี่เป็นตัวอย่างหน้าร้าน ยังไม่ได้เชื่อมต่อระบบชำระเงินจริง กรุณาตั้งค่าระบบออเดอร์และ Payment Gateway ก่อนเปิดรับคำสั่งซื้อ")}>ดำเนินการสั่งซื้อ <ArrowRight size={17} /></button><p className="tiny-note">ยังไม่มีการเรียกเก็บเงินจริงในเวอร์ชันตัวอย่างนี้</p></>}</aside></div>}
    </main>
  );
}