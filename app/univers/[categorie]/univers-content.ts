export interface UniversSection {
  title: string;
  body: string;
}

export interface UniversContent {
  tagline: string;
  intro: string;
  sections: UniversSection[];
  materials: string[];
}

const DEFAULT_CONTENT: UniversContent = {
  tagline: "Fait main, en Bretagne",
  intro:
    "Chaque pièce est façonnée à la main dans mon atelier, avec une attention particulière portée aux détails et à la durabilité.",
  sections: [
    {
      title: "Comment je les fabrique",
      body:
        "Chaque création commence par une sélection minutieuse des matériaux, puis passe par plusieurs étapes de façonnage, de polissage et de finition, entièrement réalisées à la main.",
    },
    {
      title: "Pourquoi ces bijoux",
      body:
        "Je crée des pièces uniques, pensées pour durer et pour raconter une histoire — la vôtre.",
    },
  ],
  materials: ["Résine", "Argent", "Métaux nobles"],
};

export const UNIVERS_CONTENT: Record<string, UniversContent> = {
  "bijoux-memoriels": {
    tagline: "Des souvenirs à porter près du cœur",
    intro:
      "Le lait maternel, une mèche de cheveux, des fleurs séchées ou des cendres : je transforme vos souvenirs les plus précieux en un bijou unique, pensé pour durer toute une vie.",
    sections: [
      {
        title: "Comment sont-ils fabriqués ?",
        body:
          "Chaque bijou mémoriel est réalisé à la main, dans mon atelier en Bretagne. L'élément que vous me confiez (lait maternel, cheveux, fleurs, cendres...) est préparé puis enrobé dans une résine spéciale (ArtResin & Resiners), coulée en couches successives pour un rendu net et sans bulles, avant polissage et montage sur une monture en métal noble.",
      },
      {
        title: "Pourquoi un bijou mémoriel ?",
        body:
          "Ces bijoux gardent vivant un souvenir précieux — une naissance, un être cher, un moment qui compte — pour le porter au quotidien, près de soi. Chaque pièce est unique, à l'image du souvenir qu'elle contient.",
      },
      {
        title: "Comment ça se passe ?",
        body:
          "Vous m'envoyez l'élément à intégrer (kit fourni sur demande), vous choisissez la monture et les options de personnalisation, et je façonne votre bijou avec soin avant expédition.",
      },
    ],
    materials: ["Résine ArtResin & Resiners", "Argent", "Lait maternel, cheveux, fleurs séchées, cendres"],
  },
  "bijoux-fantaisie": {
    tagline: "Des pièces uniques pour tous les jours",
    intro:
      "Des créations en résine colorées et originales, pensées pour sublimer votre quotidien sans se prendre au sérieux.",
    sections: [
      {
        title: "Comment sont-ils fabriqués ?",
        body:
          "Chaque bijou fantaisie est coulé à la main en résine, teinté et parfois orné d'inclusions (paillettes, fleurs, pigments) selon les collections, puis poncé et poli pour un fini brillant.",
      },
      {
        title: "Pourquoi ces bijoux ?",
        body:
          "Parce qu'un bijou peut être précieux sans être solennel : de la couleur, du caractère, une touche unique à ajouter à toutes vos tenues.",
      },
    ],
    materials: ["Résine", "Pigments", "Métaux"],
  },
  "objets-deco-et-porte-clefs": {
    tagline: "L'atelier au-delà du bijou",
    intro:
      "Des objets décoratifs et porte-clefs façonnés avec le même soin que mes bijoux, pour prolonger l'atelier jusque chez vous.",
    sections: [
      {
        title: "Comment sont-ils fabriqués ?",
        body:
          "Même procédé que mes bijoux : coulée en résine dans des moules choisis avec soin, finitions et montages réalisés à la main, pièce par pièce.",
      },
      {
        title: "Pourquoi ces objets ?",
        body:
          "Pour offrir un souvenir, personnaliser un trousseau de clés, ou simplement ajouter une touche artisanale à votre intérieur.",
      },
    ],
    materials: ["Résine", "Attaches métalliques"],
  },
  "medailles-animaux": {
    tagline: "Pour celles et ceux qui comptent aussi",
    intro:
      "Des médailles pensées pour vos compagnons à quatre pattes, personnalisables et résistantes au quotidien.",
    sections: [
      {
        title: "Comment sont-elles fabriquées ?",
        body:
          "Chaque médaille est façonnée et personnalisée à la main, avec des finitions pensées pour résister à un usage quotidien.",
      },
      {
        title: "Pourquoi une médaille personnalisée ?",
        body:
          "Pour identifier et chouchouter votre animal avec une pièce aussi unique que lui.",
      },
    ],
    materials: ["Métal", "Résine"],
  },
};

export function getUniversContent(key: string): UniversContent {
  return UNIVERS_CONTENT[key] ?? DEFAULT_CONTENT;
}
