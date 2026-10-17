import type { Category, QuestDef, Rarity, RecipeDef, ResourceId } from '../types';

interface RecipeSeed {
  id: string;
  name: string;
  icon: string;
  ingredients: ResourceId[];
  category: Category;
  rarity: Rarity;
  flavor: string;
  /** [titre, description] */
  quests: [string, string][];
}

const SEEDS: RecipeSeed[] = [
  {
    id: 'rosee-matinale',
    name: 'Rosée Matinale',
    icon: '🌅',
    ingredients: ['water', 'water'],
    category: 'bienetre',
    rarity: 'commune',
    flavor: 'Deux gouttes pures et le monde ralentit.',
    quests: [
      ['Les Trois Souffles', "Assieds-toi sans écran 10 minutes : inspire 4 s, retiens 4 s, expire 6 s."],
      ['Étirements du Réveil', 'Fais 10 minutes d’étirements doux, de la nuque jusqu’aux chevilles, sans musique ni vidéo.'],
      ['Journal du Matin', 'Écris à la main trois lignes : comment tu te sens, ce que tu espères, ce dont tu es reconnaissant.'],
    ],
  },
  {
    id: 'infusion-du-calme',
    name: 'Infusion du Calme',
    icon: '🍵',
    ingredients: ['water', 'sage'],
    category: 'cuisine',
    rarity: 'commune',
    flavor: 'La sauge parfume l’eau, le temps se dilue.',
    quests: [
      ['Tisane Maison', 'Prépare une infusion avec de vraies plantes ou épices, et bois-la lentement, sans écran.'],
      ['Soupe du Jour', 'Cuisine une soupe de légumes maison : épluche, coupe, laisse mijoter, savoure.'],
      ['Citronnade Artisanale', 'Presse des citrons, ajoute eau et miel, et partage le pichet avec quelqu’un.'],
    ],
  },
  {
    id: 'brume-etoilee',
    name: 'Brume Étoilée',
    icon: '🌌',
    ingredients: ['water', 'stardust'],
    category: 'balade',
    rarity: 'commune',
    flavor: 'Une vapeur d’argent qui donne envie de sortir.',
    quests: [
      ['Marche du Crépuscule', 'Sors marcher 20 minutes au coucher du soleil, téléphone au fond de la poche.'],
      ['Chasseur de Ciel', 'Repère cinq choses dans le ciel (nuage, oiseau, étoile, avion, lune) et note-les sur papier.'],
      ['Les Cinq Sens', 'Dehors, nomme 5 choses vues, 4 touchées, 3 entendues, 2 senties et 1 goûtée.'],
    ],
  },
  {
    id: 'constellation',
    name: 'Constellation',
    icon: '⭐',
    ingredients: ['stardust', 'stardust'],
    category: 'creation',
    rarity: 'commune',
    flavor: 'Deux étincelles relient leurs points.',
    quests: [
      ['Dessin à l’Aveugle', 'Dessine un objet sans regarder ta feuille pendant 5 minutes. Garde le résultat, même étrange.'],
      ['Carte du Ciel Imaginaire', 'Invente une constellation, dessine-la et écris son histoire en deux phrases.'],
      ['Origami', 'Plie un objet en papier (grue, bateau, avion) et place-le à un endroit bien visible.'],
    ],
  },
  {
    id: 'potion-verdoyante',
    name: 'Potion Verdoyante',
    icon: '🥗',
    ingredients: ['sage', 'sage'],
    category: 'cuisine',
    rarity: 'commune',
    flavor: 'Le jardin entier dans une fiole.',
    quests: [
      ['Salade de Saison', 'Compose une salade avec au moins cinq ingrédients frais et prépare ta propre vinaigrette.'],
      ['Galettes Minute', 'Prépare des galettes de pain à la poêle (farine, eau, sel, huile) et mange-les tièdes.'],
      ['Herbes Aromatiques', 'Plante ou rempote une herbe aromatique, puis utilise-en une feuille dans ton prochain repas.'],
    ],
  },
  {
    id: 'philtre-inspirant',
    name: 'Philtre Inspirant',
    icon: '✍️',
    ingredients: ['stardust', 'sage'],
    category: 'creation',
    rarity: 'commune',
    flavor: 'Les idées arrivent quand on pose le téléphone.',
    quests: [
      ['Lettre à la Main', 'Écris une vraie lettre ou carte postale à quelqu’un, puis poste-la.'],
      ['Histoire en 100 Mots', 'Écris sur papier une courte histoire d’exactement cent mots.'],
      ['Croquis du Coin Préféré', 'Dessine pendant 15 minutes le coin de ta maison que tu aimes le plus.'],
    ],
  },
  {
    id: 'torrent-de-vitalite',
    name: 'Torrent de Vitalité',
    icon: '💪',
    ingredients: ['water', 'water', 'water'],
    category: 'sport',
    rarity: 'commune',
    flavor: 'Une cascade d’énergie qui réveille les muscles.',
    quests: [
      ['Circuit du Salon', 'Enchaîne 3 tours : 15 squats, 10 pompes (sur les genoux si besoin) et 30 s de gainage.'],
      ['Danse Libre', 'Mets de la musique sur une enceinte (sans écran) et danse 10 minutes comme si personne ne te voyait.'],
      ['Montagne d’Escaliers', 'Monte et descends les escaliers 10 fois à bon rythme.'],
    ],
  },
  {
    id: 'seve-herboriste',
    name: 'Sève de l’Herboriste',
    icon: '🌱',
    ingredients: ['sage', 'sage', 'water'],
    category: 'balade',
    rarity: 'commune',
    flavor: 'Elle sent la terre mouillée et l’herbe coupée.',
    quests: [
      ['Promenade Botanique', 'Marche 25 minutes en identifiant au moins cinq plantes ou arbres différents.'],
      ['Chasse aux Feuilles', 'Ramasse trois feuilles de formes différentes et colle-les sur une feuille pour faire un petit herbier.'],
      ['Pause sous l’Arbre', 'Trouve un arbre, assieds-toi dessous 10 minutes et observe tout ce qui bouge.'],
    ],
  },
  {
    id: 'encre-cosmique',
    name: 'Encre Cosmique',
    icon: '🖋️',
    ingredients: ['stardust', 'stardust', 'sage'],
    category: 'creation',
    rarity: 'rare',
    flavor: 'Une encre noire pailletée d’étoiles.',
    quests: [
      ['Poème Fait Main', 'Écris un poème de huit vers et recopie-le soigneusement sur une belle feuille.'],
      ['Bricolage de Récup', 'Transforme un objet destiné à la poubelle en quelque chose d’utile ou de décoratif.'],
      ['Mini-BD', 'Dessine une bande dessinée en quatre cases qui raconte ta journée.'],
    ],
  },
  {
    id: 'trinite-primordiale',
    name: 'Trinité Primordiale',
    icon: '⚗️',
    ingredients: ['water', 'stardust', 'sage'],
    category: 'cuisine',
    rarity: 'rare',
    flavor: 'Eau, ciel et terre : la base de toute cuisine.',
    quests: [
      ['Repas de A à Z', 'Cuisine un vrai repas à partir d’ingrédients bruts, avec une recette papier ou de tête.'],
      ['Pâtisserie du Dimanche', 'Prépare un gâteau ou des biscuits maison, et partage-les.'],
      ['Bocal de Saison', 'Prépare une conserve, une confiture ou un pesto maison.'],
    ],
  },
  {
    id: 'larme-de-cristal',
    name: 'Larme de Cristal',
    icon: '🏃',
    ingredients: ['essence', 'water'],
    category: 'sport',
    rarity: 'rare',
    flavor: 'Une larme glacée qui donne des jambes neuves.',
    quests: [
      ['Footing Sans Musique', 'Cours ou marche vite 30 minutes en n’écoutant que ton souffle et ton environnement.'],
      ['Séance de Yoga', 'Enchaîne 20 minutes de yoga ou de mobilité avec une routine que tu connais déjà.'],
      ['Sortie à Vélo', 'Fais 30 minutes de vélo sur un trajet que tu connais, sans rien écouter.'],
    ],
  },
  {
    id: 'racine-d-eternite',
    name: 'Racine d’Éternité',
    icon: '🥾',
    ingredients: ['essence', 'sage'],
    category: 'balade',
    rarity: 'rare',
    flavor: 'Elle pousse lentement, comme les bonnes promenades.',
    quests: [
      ['La Grande Boucle', 'Marche une heure vers un endroit que tu ne connais pas, sans téléphone en main.'],
      ['Pique-nique Sauvage', 'Prépare un pique-nique et mange-le dehors, dans un lieu calme.'],
      ['Quête du Point de Vue', 'Rejoins un point haut près de chez toi, assieds-toi, puis dessine ou décris ce que tu vois.'],
    ],
  },
  {
    id: 'eclat-prismatique',
    name: 'Éclat Prismatique',
    icon: '🎨',
    ingredients: ['essence', 'stardust'],
    category: 'creation',
    rarity: 'rare',
    flavor: 'Un cristal qui décompose la lumière en idées.',
    quests: [
      ['Peinture Libre', 'Peins ou colorie sur une vraie feuille pendant 30 minutes, sans modèle.'],
      ['Concert Privé', 'Joue d’un instrument ou chante pendant 20 minutes, sans rien enregistrer.'],
      ['Grande Construction', 'Construis quelque chose de tes mains : maquette, cabane de coussins, briques, bricolage.'],
    ],
  },
  {
    id: 'coeur-du-temps',
    name: 'Cœur du Temps',
    icon: '⌛',
    ingredients: ['essence', 'essence'],
    category: 'bienetre',
    rarity: 'rare',
    flavor: 'Deux cristaux qui battent à l’unisson.',
    quests: [
      ['Soirée sans Écran', 'Passe ta prochaine soirée sans écran : lecture, jeu de société, conversation ou cuisine.'],
      ['Matinée Offline', 'Passe les deux premières heures de ta prochaine matinée sans regarder ton téléphone.'],
      ['Grand Rangement', 'Range un tiroir ou une étagère entière, puis note trois choses dont tu peux te séparer.'],
    ],
  },
];

function build(seed: RecipeSeed): RecipeDef {
  return {
    id: seed.id,
    name: seed.name,
    icon: seed.icon,
    ingredients: seed.ingredients,
    category: seed.category,
    rarity: seed.rarity,
    flavor: seed.flavor,
    quests: seed.quests.map(([title, description], i) => ({
      id: `${seed.id}-${i + 1}`,
      title,
      description,
      category: seed.category,
      rarity: seed.rarity,
    })),
  };
}

export const RECIPES: readonly RecipeDef[] = SEEDS.map(build);

export const RECIPE_BY_ID: Readonly<Record<string, RecipeDef>> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r]),
);

/** Clé canonique d'un mélange : ingrédients triés (l'ordre n'a pas d'importance). */
export function recipeKey(ingredients: readonly ResourceId[]): string {
  return [...ingredients].sort().join('+');
}

const RECIPE_BY_KEY = new Map(RECIPES.map((r) => [recipeKey(r.ingredients), r]));

export function findRecipe(ingredients: readonly ResourceId[]): RecipeDef | undefined {
  return RECIPE_BY_KEY.get(recipeKey(ingredients));
}

/** Quêtes Épiques : tirées au sort par le Mode Chaotique. */
export const EPIC_QUESTS: readonly QuestDef[] = (
  [
    ['Le Repas Légendaire', 'Cuisine un repas complet de trois plats pour au moins deux personnes, sans écran allumé dans la cuisine.', 'cuisine'],
    ['Pèlerinage du Randonneur', 'Marche au moins 90 minutes dans un lieu naturel, sans téléphone en main.', 'balade'],
    ['Le Manuscrit Perdu', 'Écris trois pages à la main : une histoire, un souvenir ou une lettre.', 'creation'],
    ['Sommet Domestique', 'Range et nettoie une pièce entière de fond en comble (musique d’ambiance autorisée).', 'bienetre'],
    ['Atelier de l’Artisan', 'Fabrique un objet utile ou décoratif de tes mains : couture, bois, papier, poterie…', 'creation'],
    ['Nuit des Étoiles', 'Reste dehors après la tombée de la nuit et observe le ciel pendant 30 minutes.', 'balade'],
    ['Épreuve du Souffle', 'Fais 45 minutes de sport continu : course, vélo, natation ou renforcement.', 'sport'],
    ['La Visite Surprise', 'Rends visite à quelqu’un que tu n’as pas vu depuis longtemps, ou invite-le.', 'bienetre'],
    ['Le Jardin Secret', 'Plante ou entretiens quelque chose de vivant : jardinière, balcon, jardin partagé.', 'bienetre'],
    ['Bibliothèque Ancienne', 'Lis un livre papier pendant 60 minutes d’affilée.', 'bienetre'],
    ['Trésor du Quartier', 'Explore un quartier ou un lieu proche que tu ne connais pas, avec un carnet de notes.', 'balade'],
    ['Récital du Sorcier', 'Apprends un morceau ou une chanson, puis joue-le ou chante-le pour quelqu’un.', 'creation'],
  ] as [string, string, Category][]
).map(([title, description, category], i) => ({
  id: `epic-${i + 1}`,
  title,
  description,
  category,
  rarity: 'epique' as const,
}));

/** Micro-défis d'une minute : donnés par l'Explosion du Chaudron. */
export const MICRO_CHALLENGES: readonly QuestDef[] = (
  [
    ['Gorgée de Cristal', 'Bois un grand verre d’eau, lentement.', 'bienetre'],
    ['Dix Étirements', 'Fais 10 étirements : nuque, épaules, dos, jambes.', 'sport'],
    ['Cinq Respirations', 'Ferme les yeux et respire profondément 5 fois.', 'bienetre'],
    ['Regard Lointain', 'Regarde un point lointain par la fenêtre pendant 60 secondes.', 'bienetre'],
    ['Quinze Squats', 'Fais 15 squats, maintenant.', 'sport'],
    ['Danse de la Victoire', 'Danse une minute, sans musique et sans honte.', 'sport'],
    ['Fenêtre Ouverte', 'Ouvre une fenêtre et respire l’air extérieur pendant une minute.', 'bienetre'],
    ['Épaules de Sage', 'Roule tes épaules 10 fois vers l’arrière et redresse-toi.', 'sport'],
    ['Trois Gratitudes', 'Pense à trois choses pour lesquelles tu es reconnaissant aujourd’hui.', 'bienetre'],
    ['Mains Vivantes', 'Masse tes mains et tes poignets pendant une minute.', 'bienetre'],
    ['Table Nette', 'Range ce qui traîne sur la surface la plus proche de toi.', 'cuisine'],
    ['Planche Éclair', 'Tiens la planche aussi longtemps que possible (objectif : 30 secondes).', 'sport'],
  ] as [string, string, Category][]
).map(([title, description, category], i) => ({
  id: `micro-${i + 1}`,
  title,
  description,
  category,
  rarity: 'defi' as const,
}));
