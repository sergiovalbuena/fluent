// Songs for Music Time (lyrics training over a YouTube video), by course language.
// Only traditional, public-domain songs: their lyrics can be shown freely. The
// videos are embeddable recordings checked with YouTube's oEmbed endpoint.
//
// `start` (seconds) is optional per line. Without it the game runs in free mode
// (the video plays and the learner fills the gaps at their own pace); with it,
// the video pauses at the end of each line that has a gap. Times can be captured
// with the sync tool: /mini-games/musictime?sync=<song id>.

export type SongLine = { text: string; start?: number }

export type Song = {
  id: string
  title: string
  /** Shown under the title, in the course language */
  origin: string
  videoId: string
  lines: SongLine[]
}

const FR = 'Chanson traditionnelle'
const EN = 'Traditional song'

const l = (...texts: string[]): SongLine[] => texts.map(text => ({ text }))

export const SONGS: Record<string, Song[]> = {
  fr: [
    {
      id: 'au-clair-de-la-lune', title: 'Au clair de la lune', origin: FR, videoId: 'z14y_YjbqVM',
      lines: l(
        'Au clair de la lune,', 'Mon ami Pierrot,', 'Prête-moi ta plume', 'Pour écrire un mot.',
        'Ma chandelle est morte,', 'Je n’ai plus de feu.', 'Ouvre-moi ta porte', 'Pour l’amour de Dieu.',
      ),
    },
    {
      id: 'frere-jacques', title: 'Frère Jacques', origin: FR, videoId: 'TPzLzQSu1vA',
      lines: l('Frère Jacques, frère Jacques,', 'Dormez-vous ? Dormez-vous ?', 'Sonnez les matines ! Sonnez les matines !', 'Ding, daing, dong. Ding, daing, dong.'),
    },
    {
      id: 'sur-le-pont-d-avignon', title: 'Sur le pont d’Avignon', origin: FR, videoId: 'iLvVZny4HzQ',
      lines: l(
        'Sur le pont d’Avignon,', 'L’on y danse, l’on y danse,', 'Sur le pont d’Avignon,', 'L’on y danse tous en rond.',
        'Les beaux messieurs font comme ça,', 'Et puis encore comme ça.',
      ),
    },
    {
      id: 'une-souris-verte', title: 'Une souris verte', origin: FR, videoId: 'ghnB7c7hiKg',
      lines: l(
        'Une souris verte', 'Qui courait dans l’herbe,', 'Je l’attrape par la queue,', 'Je la montre à ces messieurs.',
        'Ces messieurs me disent :', 'Trempez-la dans l’huile,', 'Trempez-la dans l’eau,', 'Ça fera un escargot tout chaud.',
      ),
    },
    {
      id: 'alouette', title: 'Alouette', origin: FR, videoId: 'qNhIcfszeDQ',
      lines: l('Alouette, gentille alouette,', 'Alouette, je te plumerai.', 'Je te plumerai la tête,', 'Je te plumerai la tête,', 'Et la tête, et la tête,', 'Alouette, alouette, oh !'),
    },
    {
      id: 'meunier-tu-dors', title: 'Meunier, tu dors', origin: FR, videoId: 'krPml4f0954',
      lines: l('Meunier, tu dors,', 'Ton moulin, ton moulin va trop vite.', 'Meunier, tu dors,', 'Ton moulin, ton moulin va trop fort.'),
    },
    {
      id: 'il-pleut-bergere', title: 'Il pleut, il pleut, bergère', origin: FR, videoId: 'ygdL8YNfZdA',
      lines: l(
        'Il pleut, il pleut, bergère,', 'Presse tes blancs moutons,', 'Allons sous ma chaumière,', 'Bergère, vite, allons.',
        'J’entends sous le feuillage', 'L’eau qui tombe à grand bruit ;', 'Voici, voici l’orage,', 'Voici l’éclair qui luit.',
      ),
    },
    {
      id: 'a-la-claire-fontaine', title: 'À la claire fontaine', origin: FR, videoId: 'jWiZRLmEoxc',
      lines: l('À la claire fontaine', 'M’en allant promener,', 'J’ai trouvé l’eau si belle', 'Que je m’y suis baigné.', 'Il y a longtemps que je t’aime,', 'Jamais je ne t’oublierai.'),
    },
  ],
  en: [
    {
      id: 'twinkle-twinkle', title: 'Twinkle, Twinkle, Little Star', origin: EN, videoId: 'yCjJyiqpAuU',
      lines: l('Twinkle, twinkle, little star,', 'How I wonder what you are!', 'Up above the world so high,', 'Like a diamond in the sky.', 'Twinkle, twinkle, little star,', 'How I wonder what you are!'),
    },
    {
      id: 'row-your-boat', title: 'Row, Row, Row Your Boat', origin: EN, videoId: '7otAJa3jui8',
      lines: l('Row, row, row your boat', 'Gently down the stream.', 'Merrily, merrily, merrily, merrily,', 'Life is but a dream.'),
    },
    {
      id: 'mary-had-a-little-lamb', title: 'Mary Had a Little Lamb', origin: EN, videoId: 'uyvdG39-Gzk',
      lines: l('Mary had a little lamb,', 'Its fleece was white as snow.', 'And everywhere that Mary went,', 'The lamb was sure to go.'),
    },
    {
      id: 'itsy-bitsy-spider', title: 'The Itsy Bitsy Spider', origin: EN, videoId: 'qIT-C7lxqp8',
      lines: l('The itsy bitsy spider', 'Climbed up the water spout.', 'Down came the rain', 'And washed the spider out.', 'Out came the sun', 'And dried up all the rain,', 'And the itsy bitsy spider', 'Climbed up the spout again.'),
    },
    {
      id: 'old-macdonald', title: 'Old MacDonald Had a Farm', origin: EN, videoId: 'dpnUYVezBVw',
      lines: l('Old MacDonald had a farm,', 'E-I-E-I-O.', 'And on his farm he had a cow,', 'E-I-E-I-O.', 'With a moo moo here', 'And a moo moo there.'),
    },
    {
      id: 'london-bridge', title: 'London Bridge', origin: EN, videoId: '0v8xMDeRspk',
      lines: l('London Bridge is falling down,', 'Falling down, falling down.', 'London Bridge is falling down,', 'My fair lady.'),
    },
  ],
}
