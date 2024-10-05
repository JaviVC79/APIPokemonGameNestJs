import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { UpdatePokemonApiDto } from './dto/update-pokemon-api.dto';
import { PlayerDto } from './dto/player-dto';
import { PokemonTeamDto } from './dto/pokemon-team-dto';
import { PokemonTypeEntity } from './enums/pokemon-entity-enum';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './authUser.service';


@Controller('pokemon-api')
export class PokemonApiController {
  constructor(
    private readonly pokemonApiService: PokemonApiService,
    private readonly authService: AuthService,
  ) {}


  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() user:any, @Res({ passthrough: true }) response: Response) {
    const userJwt = await this.authService.signIn(user);
    //console.log(userJwt)
    response.cookie('jwt', userJwt)
    response.cookie('userEmail', user.email)
    return userJwt
  }

  @Post()
  createPlayer(@Body() playerDto: PlayerDto) {
    return this.pokemonApiService.createPlayer(playerDto);
  }

  @UseGuards(AuthGuard)
  @Post('team/:playerId')
  createTeam(@Body() pokemonTeamDto: PokemonTeamDto, @Param('playerId') playerId: string) {
    pokemonTeamDto.playerId = +playerId;
    return this.pokemonApiService.createTeam(pokemonTeamDto);
  }

  @UseGuards(AuthGuard)
  @Post('pokemon/:teamId')
  createPokemon(@Body() pokemonData: any, @Param('teamId') teamId: string) {
    pokemonData[0].teamId = +teamId;
    return this.pokemonApiService.createPokemonAndStats(pokemonData);
  }
  //Get Methods----------------------------------------------------------------------------------------------------------------------------------------------
  //Get All 
  @UseGuards(AuthGuard)
  @Get()
  findAll() {
    return this.pokemonApiService.findAll();
  }
  
  //Get by Player id
  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const pokemon = await this.pokemonApiService.findOne(+id);
    return res.json(pokemon);
  }

  @UseGuards(AuthGuard)
  @Patch(':pokemonEntity/:id')
  update(@Param('id') id: string, @Param('pokemonEntity') pokemonEntity: PokemonTypeEntity, @Body() playerDto: Partial<PlayerDto> | UpdatePokemonApiDto) {
    return this.pokemonApiService.updateAll(+id, playerDto, pokemonEntity);
    
  }

  //Delete Methods----------------------------------------------------------------------------------------------------------------------------------------------
  //Delete Team  
  @UseGuards(AuthGuard)
  @Delete('team/:id')
  removePokemonTeam(@Param('id') id: string) {
    return this.pokemonApiService.removePokemonTeam(+id);
  }
  //Delete Player 
  @UseGuards(AuthGuard)
  @Delete('player/:id')
  removePlayer(@Param('id') id: string) {
    return this.pokemonApiService.removePlayer(+id);
  }
  //Delete Pokemon & his Stats
  @UseGuards(AuthGuard)
  @Delete('pokemon/:pokemonId')
  removePokemon(@Param('pokemonId') pokemonId: string) {
    return this.pokemonApiService.removePokemon(+pokemonId);
  }





}
