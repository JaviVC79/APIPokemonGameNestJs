import { PlayerDto } from "./player-dto";
import { PokemonDto } from "./pokemon-dto";
import { PokemonTeamDto } from "./pokemon-team-dto";
import { StatsDto } from "./stats-dto";

export class CreatePokemonApiDto {
    playerDto: PlayerDto;
    pokemonDto: PokemonDto;
    pokemonTeamDto: PokemonTeamDto;
    statsDto: StatsDto;
}
