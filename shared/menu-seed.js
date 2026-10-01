// Cardápio de exemplo que todo restaurante novo recebe (vem do seed do Brasa Grill).
// Preços em centavos.

export const SAMPLE_CATEGORIES = [
  {
    "id": "starters",
    "name": {
      "pt": "Entradas",
      "en": "Starters",
      "de": "Vorspeisen"
    }
  },
  {
    "id": "grill",
    "name": {
      "pt": "Na brasa",
      "en": "From the grill",
      "de": "Vom Grill"
    }
  },
  {
    "id": "burgers",
    "name": {
      "pt": "Burgers",
      "en": "Burgers",
      "de": "Burger"
    }
  },
  {
    "id": "desserts",
    "name": {
      "pt": "Sobremesas",
      "en": "Desserts",
      "de": "Desserts"
    }
  },
  {
    "id": "drinks",
    "name": {
      "pt": "Bebidas",
      "en": "Drinks",
      "de": "Getränke"
    }
  }
];

export const SAMPLE_ITEMS = [
  {
    "id": "golden-onion",
    "categoryId": "starters",
    "name": {
      "pt": "Cebola Dourada",
      "en": "Golden Onion",
      "de": "Goldene Zwiebel"
    },
    "description": {
      "pt": "Cebola gigante empanada e frita, servida com molho cremoso da casa levemente picante.",
      "en": "Giant battered and fried onion, served with our creamy, slightly spicy house dip.",
      "de": "Riesige panierte und frittierte Zwiebel mit cremigem, leicht scharfem Haus-Dip."
    },
    "price": 5990,
    "image": "https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=70",
    "featured": true,
    "available": true
  },
  {
    "id": "ember-wings",
    "categoryId": "starters",
    "name": {
      "pt": "Asinhas na Brasa",
      "en": "Ember Wings",
      "de": "Glut-Chicken-Wings"
    },
    "description": {
      "pt": "Asinhas de frango marinadas, grelhadas na brasa e finalizadas com glaze de mel e pimenta.",
      "en": "Marinated chicken wings, charcoal-grilled and finished with a honey-chili glaze.",
      "de": "Marinierte Hähnchenflügel vom Holzkohlegrill mit Honig-Chili-Glasur."
    },
    "price": 5490,
    "image": "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  },
  {
    "id": "rustic-fries",
    "categoryId": "starters",
    "name": {
      "pt": "Batatas Rústicas",
      "en": "Rustic Loaded Fries",
      "de": "Rustikale Pommes"
    },
    "description": {
      "pt": "Batatas crocantes com cheddar derretido, bacon e cebolinha.",
      "en": "Crispy potatoes with melted cheddar, bacon and spring onions.",
      "de": "Knusprige Kartoffeln mit geschmolzenem Cheddar, Speck und Frühlingszwiebeln."
    },
    "price": 4690,
    "image": "https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  },
  {
    "id": "slow-ribs",
    "categoryId": "grill",
    "name": {
      "pt": "Costela ao Fogo Lento",
      "en": "Slow-Fire Ribs",
      "de": "Spareribs vom langsamen Feuer"
    },
    "description": {
      "pt": "Costela suína assada por 8 horas, laqueada com barbecue defumado. Acompanha fritas.",
      "en": "Pork ribs roasted for 8 hours and glazed with smoky barbecue sauce. Served with fries.",
      "de": "8 Stunden gegarte Schweinerippchen mit rauchiger BBQ-Glasur. Mit Pommes."
    },
    "price": 9890,
    "image": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=70",
    "featured": true,
    "available": true
  },
  {
    "id": "ribeye-350",
    "categoryId": "grill",
    "name": {
      "pt": "Ancho Grelhado 350g",
      "en": "Grilled Ribeye 350g",
      "de": "Ribeye vom Grill 350 g"
    },
    "description": {
      "pt": "Corte ancho grelhado na parrilla com manteiga de ervas e dois acompanhamentos.",
      "en": "Ribeye cut grilled on the parrilla with herb butter and two sides.",
      "de": "Ribeye von der Parrilla mit Kräuterbutter und zwei Beilagen."
    },
    "price": 11290,
    "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&w=800&q=70",
    "featured": true,
    "available": true
  },
  {
    "id": "picanha",
    "categoryId": "grill",
    "name": {
      "pt": "Picanha na Brasa",
      "en": "Charcoal Picanha",
      "de": "Picanha von der Glut"
    },
    "description": {
      "pt": "Picanha fatiada na brasa com farofa de alho, vinagrete e arroz.",
      "en": "Sliced picanha from the coals with garlic farofa, vinaigrette salsa and rice.",
      "de": "Geschnittene Picanha mit Knoblauch-Farofa, Vinaigrette-Salsa und Reis."
    },
    "price": 10490,
    "image": "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  },
  {
    "id": "mixed-grill",
    "categoryId": "grill",
    "name": {
      "pt": "Parrillada para Dois",
      "en": "Mixed Grill for Two",
      "de": "Grillplatte für Zwei"
    },
    "description": {
      "pt": "Picanha, ancho, linguiça e frango na brasa com três acompanhamentos. Serve duas pessoas.",
      "en": "Picanha, ribeye, sausage and chicken from the grill with three sides. Serves two.",
      "de": "Picanha, Ribeye, Wurst und Hähnchen vom Grill mit drei Beilagen. Für zwei Personen."
    },
    "price": 18990,
    "image": "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=70",
    "featured": true,
    "available": true
  },
  {
    "id": "smoked-burger",
    "categoryId": "burgers",
    "name": {
      "pt": "Burger Defumado",
      "en": "Smokehouse Burger",
      "de": "Smokehouse-Burger"
    },
    "description": {
      "pt": "Blend de 200g, cheddar, bacon crocante e cebola caramelizada no pão brioche.",
      "en": "200g beef patty, cheddar, crispy bacon and caramelised onion on a brioche bun.",
      "de": "200 g Rindfleisch, Cheddar, knuspriger Speck und karamellisierte Zwiebeln im Brioche."
    },
    "price": 5890,
    "image": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=70",
    "featured": true,
    "available": true
  },
  {
    "id": "double-cheddar",
    "categoryId": "burgers",
    "name": {
      "pt": "Double Cheddar",
      "en": "Double Cheddar",
      "de": "Double Cheddar"
    },
    "description": {
      "pt": "Dois smash burgers, cheddar em dobro, picles e molho especial.",
      "en": "Two smash patties, double cheddar, pickles and special sauce.",
      "de": "Zwei Smash-Patties, doppelt Cheddar, Essiggurken und Spezialsauce."
    },
    "price": 6490,
    "image": "https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  },
  {
    "id": "lava-brownie",
    "categoryId": "desserts",
    "name": {
      "pt": "Brownie Vulcão",
      "en": "Lava Brownie",
      "de": "Lava-Brownie"
    },
    "description": {
      "pt": "Brownie quente com sorvete de creme, calda de chocolate e nozes.",
      "en": "Warm brownie with vanilla ice cream, chocolate sauce and walnuts.",
      "de": "Warmer Brownie mit Vanilleeis, Schokoladensauce und Walnüssen."
    },
    "price": 3990,
    "image": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=70",
    "featured": true,
    "available": true
  },
  {
    "id": "berry-cheesecake",
    "categoryId": "desserts",
    "name": {
      "pt": "Cheesecake de Frutas Vermelhas",
      "en": "Berry Cheesecake",
      "de": "Beeren-Käsekuchen"
    },
    "description": {
      "pt": "Cheesecake cremoso com calda artesanal de frutas vermelhas.",
      "en": "Creamy cheesecake with a homemade red berry sauce.",
      "de": "Cremiger Käsekuchen mit hausgemachter Beerensauce."
    },
    "price": 3490,
    "image": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  },
  {
    "id": "house-lemonade",
    "categoryId": "drinks",
    "name": {
      "pt": "Limonada da Casa",
      "en": "House Lemonade",
      "de": "Hausgemachte Limonade"
    },
    "description": {
      "pt": "Limonada com hortelã e gengibre, servida bem gelada.",
      "en": "Lemonade with mint and ginger, served ice cold.",
      "de": "Limonade mit Minze und Ingwer, eiskalt serviert."
    },
    "price": 1690,
    "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  },
  {
    "id": "signature-cocktail",
    "categoryId": "drinks",
    "name": {
      "pt": "Drink Assinatura Brasa",
      "en": "Brasa Signature Cocktail",
      "de": "Brasa Signature-Cocktail"
    },
    "description": {
      "pt": "Cachaça envelhecida, maracujá, mel defumado e limão.",
      "en": "Aged cachaça, passion fruit, smoked honey and lime.",
      "de": "Gereifter Cachaça, Maracuja, geräucherter Honig und Limette."
    },
    "price": 3290,
    "image": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=70",
    "featured": false,
    "available": true
  }
];
