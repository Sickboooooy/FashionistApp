import express from 'express';
import path from 'path';

const app = express();
const PORT = 5000;

// Middleware
app.use(express.static('dist/public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Anna Designs data
const annaDesigns = [
  {
    id: 1,
    name: "Anna's Signature Dress",
    description: "Elegant black evening dress with gold details",
    category: "Dresses",
    imageUrl: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  },
  {
    id: 2,
    name: "Pearl Stilettos",
    description: "Handcrafted stiletto heels with pearl embellishments",
    category: "Footwear",
    imageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  },
  {
    id: 3,
    name: "Embroidered Silk Blouse",
    description: "Silk blouse with intricate hand embroidery",
    category: "Blouses",
    imageUrl: "https://images.unsplash.com/photo-1551232864-3f0890e580d9?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  },
  {
    id: 4,
    name: "Gold Pearl Statement",
    description: "Luxury pearl necklace with gold accents",
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  },
  {
    id: 5,
    name: "Evening Luxury Clutch",
    description: "Handcrafted clutch with metallic details",
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  },
  {
    id: 6,
    name: "Tailored Blazer",
    description: "Professional blazer with modern cut",
    category: "Blazers",
    imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  },
  {
    id: 7,
    name: "Designer Skirt",
    description: "A-line skirt with unique pattern",
    category: "Skirts",
    imageUrl: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    createdAt: new Date()
  },
  {
    id: 8,
    name: "Luxury Handbag",
    description: "Premium leather handbag with gold hardware",
    category: "Accessories",
    imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&h=500&q=80",
    createdAt: new Date()
  }
];

// API Routes
app.get('/api/anna-designs', (req, res) => {
  const category = req.query.category;
  if (category) {
    const filteredDesigns = annaDesigns.filter(design => 
      design.category.toLowerCase() === category.toLowerCase()
    );
    res.json(filteredDesigns);
  } else {
    res.json(annaDesigns);
  }
});

app.get('/api/anna-designs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const design = annaDesigns.find(d => d.id === id);
  if (design) {
    res.json(design);
  } else {
    res.status(404).json({ message: 'Design not found' });
  }
});

// Health check
app.get('/api/debug/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'FashionistApp Anna Style funcionando con datos completos',
    annaDesigns: annaDesigns.length,
    timestamp: new Date().toISOString() 
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.resolve('dist/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 FashionistApp Anna Style funcionando en http://localhost:${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🎨 Anna Designs API: http://localhost:${PORT}/api/anna-designs`);
  console.log(`✨ ${annaDesigns.length} diseños de Anna cargados!`);
});