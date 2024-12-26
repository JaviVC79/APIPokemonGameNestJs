interface Stats {
    user_id: string;
    id: number;
    hp: number;
    attack: number;
    specialAttack: number;
    defense: number;
    specialDefense: number;
    speed: number;
}

interface Pokemon {
    user_id: string;
    id: number;
    name: string;
    statsId: number;
    types: string;
    abilities: string;
    moves: string;
    imageURL: string;
    teamId: number;
    stats: Stats;
}

interface Team {
    user_id: string;
    id: number;
    name: string;
    playerId: number;
    pokemons: Pokemon[];
}

interface PlayerDetails {
    user_id: string;
    id: number;
    email: string;
    nickName: string;
    password: string;
    wins: number;
    losses: number;
    draws: number;
}

interface Player {
    "0": PlayerDetails;
    teams: Team[];
}

export interface ResponseBodyPlayerData {
    player: Player[];
}
