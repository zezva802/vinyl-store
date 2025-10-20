import { DataSource } from 'typeorm';
import { Vinyl } from '../../vinyls/entities/vinyl.entity';

export async function seedVinyls(dataSource: DataSource): Promise<void> {
    const vinylRepository = dataSource.getRepository(Vinyl);

    const existingCount = await vinylRepository.count();
    if (existingCount > 0) {
        // eslint-disable-next-line no-console
        console.log(
            `Database already has ${existingCount} vinyls. Skipping seed.`
        );
        return;
    }

    const vinyls = [
        {
            name: 'The Dark Side of the Moon',
            authorName: 'Pink Floyd',
            description:
                'Progressive rock masterpiece exploring themes of conflict, greed, time, and mental illness.',
            price: 29.99,
            imageUrl: 'https://picsum.photos/seed/1/400',
        },
        {
            name: 'Led Zeppelin IV',
            authorName: 'Led Zeppelin',
            description:
                'Features the iconic "Stairway to Heaven" and defined hard rock.',
            price: 27.99,
            imageUrl: 'https://picsum.photos/seed/2/400',
        },
        {
            name: 'Abbey Road',
            authorName: 'The Beatles',
            description:
                "The Beatles' penultimate album with the famous zebra crossing cover.",
            price: 31.99,
            imageUrl: 'https://picsum.photos/seed/3/400',
        },
        {
            name: 'Rumours',
            authorName: 'Fleetwood Mac',
            description:
                'One of the best-selling albums of all time with timeless hits.',
            price: 26.99,
            imageUrl: 'https://picsum.photos/seed/4/400',
        },
        {
            name: 'The Wall',
            authorName: 'Pink Floyd',
            description: 'Rock opera about isolation and abandonment.',
            price: 34.99,
            imageUrl: 'https://picsum.photos/seed/5/400',
        },
        {
            name: 'Kind of Blue',
            authorName: 'Miles Davis',
            description:
                'Revolutionary modal jazz album, one of the most influential jazz records.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/6/400',
        },
        {
            name: 'A Love Supreme',
            authorName: 'John Coltrane',
            description: 'Spiritual jazz suite in four parts.',
            price: 28.99,
            imageUrl: 'https://picsum.photos/seed/7/400',
        },
        {
            name: 'Time Out',
            authorName: 'Dave Brubeck Quartet',
            description: 'Experimental jazz featuring "Take Five".',
            price: 22.99,
            imageUrl: 'https://picsum.photos/seed/8/400',
        },
        {
            name: 'Mingus Ah Um',
            authorName: 'Charles Mingus',
            description: 'Hard bop masterpiece with political undertones.',
            price: 25.99,
            imageUrl: 'https://picsum.photos/seed/9/400',
        },
        {
            name: 'Blue Train',
            authorName: 'John Coltrane',
            description:
                "Hard bop classic showcasing Coltrane's technical prowess.",
            price: 23.99,
            imageUrl: 'https://picsum.photos/seed/10/400',
        },
        {
            name: 'Illmatic',
            authorName: 'Nas',
            description:
                'Regarded as one of the greatest hip-hop albums of all time.',
            price: 19.99,
            imageUrl: 'https://picsum.photos/seed/11/400',
        },
        {
            name: 'The Chronic',
            authorName: 'Dr. Dre',
            description: 'G-funk masterpiece that defined West Coast hip-hop.',
            price: 21.99,
            imageUrl: 'https://picsum.photos/seed/12/400',
        },
        {
            name: 'Enter the Wu-Tang (36 Chambers)',
            authorName: 'Wu-Tang Clan',
            description: 'Raw, gritty East Coast hip-hop classic.',
            price: 20.99,
            imageUrl: 'https://picsum.photos/seed/13/400',
        },
        {
            name: 'Ready to Die',
            authorName: 'The Notorious B.I.G.',
            description: 'Autobiographical debut from Biggie Smalls.',
            price: 22.99,
            imageUrl: 'https://picsum.photos/seed/14/400',
        },
        {
            name: 'The Miseducation of Lauryn Hill',
            authorName: 'Lauryn Hill',
            description: 'Neo soul and hip-hop fusion masterpiece.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/15/400',
        },
        {
            name: 'Discovery',
            authorName: 'Daft Punk',
            description: 'French house album blending electronic and disco.',
            price: 27.99,
            imageUrl: 'https://picsum.photos/seed/16/400',
        },
        {
            name: 'Selected Ambient Works 85-92',
            authorName: 'Aphex Twin',
            description: 'Pioneering ambient techno album.',
            price: 26.99,
            imageUrl: 'https://picsum.photos/seed/17/400',
        },
        {
            name: 'Music Has the Right to Children',
            authorName: 'Boards of Canada',
            description: 'Nostalgic, atmospheric electronic music.',
            price: 25.99,
            imageUrl: 'https://picsum.photos/seed/18/400',
        },
        {
            name: 'Homework',
            authorName: 'Daft Punk',
            description:
                'Debut album that brought French house to the mainstream.',
            price: 23.99,
            imageUrl: 'https://picsum.photos/seed/19/400',
        },
        {
            name: 'Dummy',
            authorName: 'Portishead',
            description: 'Trip-hop classic with haunting vocals.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/20/400',
        },
        {
            name: 'OK Computer',
            authorName: 'Radiohead',
            description:
                'Alternative rock masterpiece exploring technology and alienation.',
            price: 28.99,
            imageUrl: 'https://picsum.photos/seed/21/400',
        },
        {
            name: 'In the Aeroplane Over the Sea',
            authorName: 'Neutral Milk Hotel',
            description: 'Cult indie rock album with surreal lyrics.',
            price: 21.99,
            imageUrl: 'https://picsum.photos/seed/22/400',
        },
        {
            name: 'Loveless',
            authorName: 'My Bloody Valentine',
            description:
                'Shoegaze masterpiece with layers of distorted guitars.',
            price: 29.99,
            imageUrl: 'https://picsum.photos/seed/23/400',
        },
        {
            name: 'The Queen Is Dead',
            authorName: 'The Smiths',
            description:
                "Jangly indie rock with Morrissey's distinctive vocals.",
            price: 25.99,
            imageUrl: 'https://picsum.photos/seed/24/400',
        },
        {
            name: 'Doolittle',
            authorName: 'Pixies',
            description: 'Influential alt-rock album that inspired grunge.',
            price: 23.99,
            imageUrl: 'https://picsum.photos/seed/25/400',
        },
        {
            name: "What's Going On",
            authorName: 'Marvin Gaye',
            description: 'Socially conscious soul masterpiece.',
            price: 26.99,
            imageUrl: 'https://picsum.photos/seed/26/400',
        },
        {
            name: 'Songs in the Key of Life',
            authorName: 'Stevie Wonder',
            description: 'Double album showcasing Wonder at his peak.',
            price: 32.99,
            imageUrl: 'https://picsum.photos/seed/27/400',
        },
        {
            name: 'Back to Black',
            authorName: 'Amy Winehouse',
            description: 'Modern soul classic with retro production.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/28/400',
        },
        {
            name: 'Channel Orange',
            authorName: 'Frank Ocean',
            description: 'Genre-bending R&B with introspective lyrics.',
            price: 25.99,
            imageUrl: 'https://picsum.photos/seed/29/400',
        },
        {
            name: "D'Angelo and the Vanguard: Black Messiah",
            authorName: "D'Angelo",
            description: 'Neo-soul comeback album with funk influences.',
            price: 27.99,
            imageUrl: 'https://picsum.photos/seed/30/400',
        },
        {
            name: 'London Calling',
            authorName: 'The Clash',
            description: 'Genre-spanning double album from punk legends.',
            price: 28.99,
            imageUrl: 'https://picsum.photos/seed/31/400',
        },
        {
            name: 'Unknown Pleasures',
            authorName: 'Joy Division',
            description: 'Post-punk classic with iconic cover art.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/32/400',
        },
        {
            name: 'Nevermind',
            authorName: 'Nirvana',
            description: 'Grunge album that defined a generation.',
            price: 22.99,
            imageUrl: 'https://picsum.photos/seed/33/400',
        },
        {
            name: 'Remain in Light',
            authorName: 'Talking Heads',
            description: 'New wave with African polyrhythms.',
            price: 26.99,
            imageUrl: 'https://picsum.photos/seed/34/400',
        },
        {
            name: 'The Velvet Underground & Nico',
            authorName: 'The Velvet Underground',
            description: 'Avant-garde rock with iconic banana cover.',
            price: 27.99,
            imageUrl: 'https://picsum.photos/seed/35/400',
        },
        {
            name: 'Master of Puppets',
            authorName: 'Metallica',
            description: 'Thrash metal masterpiece with complex compositions.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/36/400',
        },
        {
            name: 'Paranoid',
            authorName: 'Black Sabbath',
            description: 'Heavy metal classic featuring iconic riffs.',
            price: 23.99,
            imageUrl: 'https://picsum.photos/seed/37/400',
        },
        {
            name: 'Reign in Blood',
            authorName: 'Slayer',
            description: 'Intense thrash metal album under 30 minutes.',
            price: 21.99,
            imageUrl: 'https://picsum.photos/seed/38/400',
        },
        {
            name: 'The Number of the Beast',
            authorName: 'Iron Maiden',
            description: 'Heavy metal with operatic vocals.',
            price: 25.99,
            imageUrl: 'https://picsum.photos/seed/39/400',
        },
        {
            name: 'Rust in Peace',
            authorName: 'Megadeth',
            description: 'Technical thrash metal with political themes.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/40/400',
        },
        {
            name: 'Blonde on Blonde',
            authorName: 'Bob Dylan',
            description: 'Double album of poetic folk-rock.',
            price: 31.99,
            imageUrl: 'https://picsum.photos/seed/41/400',
        },
        {
            name: 'Pet Sounds',
            authorName: 'The Beach Boys',
            description: 'Baroque pop masterpiece with lush arrangements.',
            price: 28.99,
            imageUrl: 'https://picsum.photos/seed/42/400',
        },
        {
            name: 'Aja',
            authorName: 'Steely Dan',
            description: 'Jazz-rock fusion with studio perfection.',
            price: 27.99,
            imageUrl: 'https://picsum.photos/seed/43/400',
        },
        {
            name: 'Exile on Main St.',
            authorName: 'The Rolling Stones',
            description: 'Double album of blues-rock and soul.',
            price: 33.99,
            imageUrl: 'https://picsum.photos/seed/44/400',
        },
        {
            name: 'Are You Experienced',
            authorName: 'The Jimi Hendrix Experience',
            description: 'Revolutionary guitar work on debut album.',
            price: 26.99,
            imageUrl: 'https://picsum.photos/seed/45/400',
        },
        {
            name: 'Born to Run',
            authorName: 'Bruce Springsteen',
            description: 'Heartland rock anthem of American dreams.',
            price: 25.99,
            imageUrl: 'https://picsum.photos/seed/46/400',
        },
        {
            name: 'Hotel California',
            authorName: 'Eagles',
            description: 'Rock album with the iconic title track.',
            price: 27.99,
            imageUrl: 'https://picsum.photos/seed/47/400',
        },
        {
            name: 'Thriller',
            authorName: 'Michael Jackson',
            description: 'Best-selling album of all time.',
            price: 29.99,
            imageUrl: 'https://picsum.photos/seed/48/400',
        },
        {
            name: 'Purple Rain',
            authorName: 'Prince and The Revolution',
            description: 'Soundtrack and pop-rock masterpiece.',
            price: 28.99,
            imageUrl: 'https://picsum.photos/seed/49/400',
        },
        {
            name: 'Back in Black',
            authorName: 'AC/DC',
            description: 'Hard rock classic and tribute to Bon Scott.',
            price: 24.99,
            imageUrl: 'https://picsum.photos/seed/50/400',
        },
    ];

    for (const vinylData of vinyls) {
        const vinyl = vinylRepository.create(vinylData);
        await vinylRepository.save(vinyl);
    }

    // eslint-disable-next-line no-console
    console.log('Successfully seeded 50 vinyls!');
}
