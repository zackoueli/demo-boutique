import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos — Anaïs",
  description: "Découvrez l'histoire d'Anaïs, créatrice de bijoux en résine pour préserver vos moments précieux.",
};

export default function AProposPage() {
  return (
    <div style={{ background: "#fdf8f4" }} className="min-h-screen">

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #fdf3ee 0%, #f7ece4 100%)", borderBottom: "1px solid #e8ddd5" }}>
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] mb-4" style={{ color: "#c0826a" }}>
            Un peu de moi
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold leading-tight mb-6" style={{ color: "#3d2b1f" }}>
            Je m&apos;appelle Anaïs,<br />
            <em className="not-italic" style={{ color: "#c0826a" }}>et voici mon histoire</em>
          </h1>
        </div>
      </section>

      {/* Contenu principal */}
      <section className="max-w-3xl mx-auto px-4 py-16 space-y-10">

        {/* Intro */}
        <div className="space-y-5 leading-relaxed" style={{ color: "#8a6858" }}>
          <p className="text-lg">
            Je m&apos;appelle Anaïs, j&apos;ai trois enfants, je suis femme de militaire, et je me définis comme une femme
            sensible, intuitive et profondément attachée aux liens humains.
          </p>
          <p>
            Chacune de mes maternités a été une transformation. Pas seulement physique, mais intérieure. Ces moments —
            les premières heures après la naissance, le regard d&apos;un nouveau-né, la douceur du lait maternel, les
            petites mains qui s&apos;agrippent — ont quelque chose d&apos;ineffable. On sait qu&apos;ils sont là,
            intenses, bouleversants. Et on sait aussi, au fond de soi, qu&apos;ils vont passer.
          </p>
          <p>
            C&apos;est ce sentiment-là qui est à l&apos;origine de tout.
          </p>
        </div>

        {/* Citation */}
        <blockquote className="border-l-4 pl-6 py-2" style={{ borderColor: "#c0826a" }}>
          <p className="font-serif text-xl italic leading-relaxed" style={{ color: "#3d2b1f" }}>
            « Cette envie de tenir le temps entre ses mains — de capturer non pas une photo, mais une sensation,
            une texture, un lien. »
          </p>
        </blockquote>

        {/* La naissance du projet */}
        <div className="space-y-5 leading-relaxed" style={{ color: "#8a6858" }}>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "#3d2b1f" }}>La naissance d&apos;Histoire Éternelle</h2>
          <p>
            C&apos;est lors de ma troisième maternité que j&apos;ai découvert la résine comme matière. Ce qui m&apos;a
            frappée d&apos;emblée, c&apos;est sa capacité à figer le vivant : une mèche de cheveux, une goutte de lait
            maternel, une fleur cueillie un matin de printemps. Des éléments qui, autrement, disparaissent ou se
            transforment avec le temps, pouvaient désormais être préservés — enchâssés dans quelque chose de solide,
            de beau, d&apos;intemporel.
          </p>
          <p>
            J&apos;ai commencé à créer pour moi. Puis pour des amies. Puis pour des femmes que je ne connaissais pas,
            mais qui me confiaient ce qu&apos;elles avaient de plus précieux : un peu de leur histoire.
          </p>
        </div>

        {/* Séparateur décoratif */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
          <Heart size={16} style={{ color: "#c0826a" }} />
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
        </div>

        {/* Ce que je fais */}
        <div className="space-y-5 leading-relaxed" style={{ color: "#8a6858" }}>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "#3d2b1f" }}>Ce que je façonne, et pourquoi</h2>
          <p>
            Aujourd&apos;hui, je crée des bijoux en résine qui portent des souvenirs. Chaque pièce est unique parce
            qu&apos;elle est faite à partir de ce que vous m&apos;apportez — une matière chargée de sens, d&apos;émotion,
            de vie. Je travaille avec le lait maternel, les cheveux de bébé, les fleurs séchées, les cendres,
            les petits riens qui font tout.
          </p>
          <p>
            Je ne suis pas seulement artisane. Je suis la gardienne d&apos;un moment que vous ne voulez pas laisser
            s&apos;effacer. Et c&apos;est une responsabilité que je prends avec beaucoup de soin et d&apos;humilité.
          </p>
          <p>
            Créer est devenu un refuge, une passion, puis une vocation. Chaque pièce que je façonne me rappelle
            que l&apos;artisanat n&apos;est pas seulement un geste technique : c&apos;est un acte d&apos;amour,
            de patience et de transmission.
          </p>
        </div>

        {/* Séparateur décoratif */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
          <Heart size={16} style={{ color: "#c0826a" }} />
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
        </div>

        {/* Pourquoi mes créations se distinguent */}
        <div className="space-y-5 leading-relaxed" style={{ color: "#8a6858" }}>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "#3d2b1f" }}>Pourquoi mes créations se distinguent ?</h2>
          <p>J&apos;utilise une résine de qualité hautement supérieure :</p>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-2xl" style={{ background: "#fdf3ee", border: "1px solid #e8ddd5" }}>
              <span className="text-2xl flex-shrink-0">✨</span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#3d2b1f" }}>Pour les créations fantaisie</p>
                <p>De la résine <strong>Resiners</strong> haut de gamme.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-2xl" style={{ background: "#fdf3ee", border: "1px solid #e8ddd5" }}>
              <span className="text-2xl flex-shrink-0">🤱</span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#3d2b1f" }}>Pour les créations mémorielles</p>
                <p>
                  De la résine <strong>ArtResin</strong>, enrichie d&apos;un agent anti-jaunissement premium
                  <strong> HALS</strong> — le meilleur sur le marché — qui garantit une durabilité exceptionnelle
                  et un blanc qui tient dans le temps.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-2xl" style={{ background: "#fff5f0", border: "1px solid #e8ddd5" }}>
              <span className="text-2xl flex-shrink-0">🚫</span>
              <div>
                <p className="font-semibold mb-1" style={{ color: "#3d2b1f" }}>Jamais de résine UV</p>
                <p>Elle jaunit systématiquement au bout de quelque temps. Pas chez moi.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Séparateur décoratif */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
          <Heart size={16} style={{ color: "#c0826a" }} />
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
        </div>

        {/* Ma passion */}
        <div className="space-y-5 leading-relaxed" style={{ color: "#8a6858" }}>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "#3d2b1f" }}>Ma passion pour l&apos;artisanat</h2>
          <blockquote className="border-l-4 pl-6 py-2" style={{ borderColor: "#c0826a" }}>
            <p className="font-serif text-lg italic leading-relaxed" style={{ color: "#3d2b1f" }}>
              « Je me consacre à la création de bijoux artisanaux en résine, valorisant des souvenirs précieux comme
              le lait maternel, les mèches de cheveux, parfois les cendres… mais aussi des bijoux et accessoires plus
              colorés à base de fleurs, de paillettes. Chaque pièce est le reflet d&apos;histoires émouvantes et
              d&apos;émotions, façonnée avec soin en Bretagne pour offrir des créations uniques et personnalisées aux
              personnes qui me font confiance. »
            </p>
          </blockquote>
        </div>

        {/* Séparateur décoratif */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
          <Heart size={16} style={{ color: "#c0826a" }} />
          <div className="flex-1 h-px" style={{ background: "#e8ddd5" }} />
        </div>

        {/* Mais alors que fais-je */}
        <div className="space-y-8 leading-relaxed" style={{ color: "#8a6858" }}>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "#3d2b1f" }}>Mais alors, que fais-je ?</h2>

          <div className="space-y-4 p-6 rounded-2xl" style={{ background: "#fdf3ee", border: "1px solid #e8ddd5" }}>
            <p className="font-serif text-lg font-semibold flex items-center gap-2" style={{ color: "#3d2b1f" }}>
              <span>❤️</span> Les bijoux fantaisie
            </p>
            <p>
              Ils sont nés de ma fascination pour la douceur du quotidien : les couleurs de la nature, les textures
              délicates, les petits éclats de lumière qui rendent une journée plus belle. Chaque bijou fantaisie est
              pensé comme une parenthèse poétique, un souffle de légèreté, une invitation à se sentir belle et unique.
            </p>
          </div>

          <div className="space-y-4 p-6 rounded-2xl" style={{ background: "#fdf3ee", border: "1px solid #e8ddd5" }}>
            <p className="font-serif text-lg font-semibold flex items-center gap-2" style={{ color: "#3d2b1f" }}>
              <span>❤️</span> Les bijoux mémoriels
            </p>
            <p>
              Ils représentent la partie la plus intime, la plus profonde de mon travail. Ici, je ne crée pas seulement
              un bijou : je transforme un fragment de vie en un objet précieux.
            </p>
            <p>
              Lait maternel, mèches de cheveux, fleurs séchées, symboles personnels… Chaque élément confié est accueilli
              avec respect, douceur et gratitude. Je sais ce qu&apos;il représente. Je sais ce qu&apos;il raconte.
              Je sais ce qu&apos;il porte.
            </p>
            <p className="font-medium italic" style={{ color: "#c0826a" }}>
              Créer un bijou mémoriel, c&apos;est entrer dans l&apos;histoire de quelqu&apos;un. C&apos;est un honneur
              que je ne prends jamais à la légère.
            </p>
          </div>
        </div>

      </section>

      {/* Valeurs */}
      <section style={{ background: "#fdf3ee", borderTop: "1px solid #e8ddd5", borderBottom: "1px solid #e8ddd5" }}>
        <div className="max-w-4xl mx-auto px-4 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          {[
            { icon: "🤱", title: "Créée avec amour", desc: "Chaque pièce naît d'une intention sincère, façonnée à la main avec patience et douceur." },
            { icon: "✨", title: "Résine & matières vivantes", desc: "Lait maternel, cheveux, fleurs séchées… je préserve ce qui vous est précieux." },
            { icon: "💌", title: "Proche de vous", desc: "Vous méritez d'être écoutée. Chaque commande est un échange humain, pas une transaction." },
          ].map((v) => (
            <div key={v.title} className="flex flex-col items-center gap-3">
              <span className="text-3xl">{v.icon}</span>
              <p className="font-serif font-semibold text-lg" style={{ color: "#3d2b1f" }}>{v.title}</p>
              <p className="text-sm leading-relaxed max-w-52" style={{ color: "#8a6858" }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Heart size={28} className="mx-auto mb-5" style={{ color: "#c0826a" }} />
        <h2 className="font-serif text-2xl font-semibold mb-4" style={{ color: "#3d2b1f" }}>
          Votre histoire mérite d&apos;être préservée
        </h2>
        <p className="mb-8 max-w-md mx-auto leading-relaxed" style={{ color: "#8a6858" }}>
          Découvrez les créations disponibles ou contactez-moi pour une pièce unique faite à partir de vos souvenirs.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/catalogue"
            className="flex items-center justify-center gap-2 px-7 py-3.5 text-white font-medium rounded-full transition-colors text-sm"
            style={{ background: "#3d2b1f" }}
          >
            Voir les créations <ArrowRight size={15} />
          </Link>
          <Link
            href="/contact"
            className="flex items-center justify-center gap-2 px-7 py-3.5 border font-medium rounded-full transition-colors text-sm"
            style={{ borderColor: "#c0826a", color: "#c0826a" }}
          >
            Me contacter
          </Link>
        </div>
      </section>

    </div>
  );
}
