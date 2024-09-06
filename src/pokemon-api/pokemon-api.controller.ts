import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { UpdatePokemonApiDto } from './dto/update-pokemon-api.dto';
import { PlayerDto } from './dto/player-dto';
import { PokemonTeamDto } from './dto/pokemon-team-dto';
import { PokemonTypeEntity } from './enums/pokemon-entity-enum';



@Controller('pokemon-api')
export class PokemonApiController {
  constructor(private readonly pokemonApiService: PokemonApiService) { }

  @Post()
  createPlayer(@Body() playerDto: PlayerDto) {
    return this.pokemonApiService.createPlayer(playerDto);
  }
  @Post('team/:playerId')
  createTeam(@Body() pokemonTeamDto: PokemonTeamDto, @Param('playerId') playerId: string) {
    pokemonTeamDto.playerId = +playerId;
    return this.pokemonApiService.createTeam(pokemonTeamDto);
  }
  @Post('pokemon/:teamId')
  createPokemon(@Body() pokemonData: any, @Param('teamId') teamId: string) {
    pokemonData[0].teamId = +teamId;
    return this.pokemonApiService.createPokemonAndStats(pokemonData);
  }
  
  @Get()
  findAll() {
    return this.pokemonApiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pokemonApiService.findOne(+id);
  }

  @Patch(':pokemonEntity/:id')
  update(@Param('id') id: string, @Param('pokemonEntity') pokemonEntity: PokemonTypeEntity, @Body() playerDto: Partial<PlayerDto> | UpdatePokemonApiDto) {
    return this.pokemonApiService.updateAll(+id, playerDto, pokemonEntity);
    
  }

  @Delete('team/:id')
  removePokemonTeam(@Param('id') id: string) {
    return this.pokemonApiService.removePokemonTeam(+id);
  }
  @Delete('player/:id')
  removePlayer(@Param('id') id: string) {
    return this.pokemonApiService.removePlayer(+id);
  }
  @Delete('pokemon/:pokemonId')
  removePokemon(@Param('pokemonId') pokemonId: string) {
    return this.pokemonApiService.removePokemon(+pokemonId);
  }
}
