import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res, HttpCode, HttpStatus, Headers, HttpException } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { UpdatePokemonApiDto } from './dto/update-pokemon-api.dto';
import { PlayerDto } from './dto/player-dto';
import { PokemonTeamDto } from './dto/pokemon-team-dto';
import { PokemonTypeEntity } from './enums/pokemon-entity-enum';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService } from './authUser.service';
import { baseUrl } from './hash/constants';
import { GameService } from './game.service';


@Controller('pokemon-api')
export class PokemonApiController {
  constructor(
    private readonly pokemonApiService: PokemonApiService,
    private readonly authService: AuthService,
    private readonly GameService: GameService
  ) { }


  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() user: any, @Res({ passthrough: true }) response: Response) {
    const userJwt = await this.authService.signIn(user);
    //response.cookie('jwt', userJwt)
    //response.cookie('userEmail', user.email)
    const SearchUser = await this.pokemonApiService.findOneByEmail(user.email, user.password)
    const user_id = SearchUser.user_id
    //console.log(SearchUser)
    return { access_token: userJwt.access_token, user_id: user_id, email: user.email }
  }

  @Post()
  async createPlayer(@Body() playerDto: PlayerDto, @Res() res: Response) {
    try {
      const newPlayer: any = await this.pokemonApiService.createPlayer(playerDto);
      res.status(HttpStatus.CREATED)
        .location(`${baseUrl}`)
        .json(newPlayer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.log(error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Post('team')
  async createTeam(@Body() pokemonTeamDto: PokemonTeamDto, @Headers('authorization') auth: string, @Res() res: Response) {
    try {
      const newTeam = await this.pokemonApiService.createTeam(pokemonTeamDto, auth);
      res.status(HttpStatus.CREATED)
        .location(`${baseUrl}/teams`)
        .json(newTeam);
    } catch (error) {
      console.log(error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Post('startGame')
  async startGame(@Body() playersId: any, @Headers('authorization') auth: string, @Res() res: Response) {
    try {
      const newGame = await this.GameService.startGame(playersId, auth);
      console.log(newGame)
      return res.json(newGame);
    } catch (error) {
      console.log(error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(AuthGuard)
  @Post('pokemon/:teamId')
  createPokemon(@Body() pokemonData: any, @Param('teamId') teamId: string, @Headers('authorization') auth: string) {
    pokemonData[0].teamId = +teamId;
    return this.pokemonApiService.createPokemonAndStats(pokemonData, auth);
  }
  //Get Methods----------------------------------------------------------------------------------------------------------------------------------------------
  //Get All 
  @UseGuards(AuthGuard)
  @Get()
  findAll(@Headers('authorization') auth: string) {
    return this.pokemonApiService.findAll(auth);
  }
  //Get teams by user_id
  @UseGuards(AuthGuard)
  @Get('teams')
  async findTeamsByUserId(@Headers('authorization') auth: string) {
    return await this.pokemonApiService.findTeamsByUserId(auth);
  }
  //Get pokemons by user_id
  @UseGuards(AuthGuard)
  @Get('pokemons')
  async findPokemonsAndHisStatsByUserId(@Headers('authorization') auth: string) {
    return await this.pokemonApiService.findPokemonsAndHisStatsByUserId(auth);
  }
  //Get pokemons by user_id and team
  /*@UseGuards(AuthGuard)
  @Get('pokemonsByTeam/:team')
  async findPokemonsAndHisStatsByUserIdAndTeams(@Headers('authorization') auth: string,@Param('team') team: string ) {
    return await this.pokemonApiService.findPokemonsAndHisStatsByUserIdAndTeams(auth, team);
  }*/

  //Get by Player id
  @UseGuards(AuthGuard)
  @Get('player/:id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const pokemon = await this.pokemonApiService.findOne(+id);
    return res.json(pokemon);
  }

  @UseGuards(AuthGuard)
  @Get('games')
  async getGamesByUser(@Headers('authorization') auth: string, @Res() res: Response) {
    const games = await this.GameService.getGamesByUser(auth);
    return res.json(games);
  }


  //Patch Methods----------------------------------------------------------------------------------------------------------------------------------------------
  /*Patch by 
  pokemonEntity(
    player = 'player',
    team = 'team',
    pokemon = 'pokemon',
    stats = 'stats',) 
  and pokemonEntity id*/
  @UseGuards(AuthGuard)
  @Patch(':pokemonEntity/:id')
  update(@Param('id') id: string, @Param('pokemonEntity') pokemonEntity: PokemonTypeEntity, @Body() playerDto: Partial<PlayerDto> | UpdatePokemonApiDto, @Headers('authorization') auth: string,
    @Res() res: Response) {
    return this.pokemonApiService.updateAll(+id, playerDto, pokemonEntity, auth, res);
  }

  //Delete Methods----------------------------------------------------------------------------------------------------------------------------------------------
  //Delete Team  
  @UseGuards(AuthGuard)
  @Delete('team/:id')
  removePokemonTeam(@Param('id') id: string, @Headers('authorization') auth: string) {
    return this.pokemonApiService.removePokemonTeam(+id, auth);
  }
  //Delete Player 
  @UseGuards(AuthGuard)
  @Delete('player')
  removePlayer(@Headers('authorization') auth: string) {
    return this.pokemonApiService.removePlayer(auth);
  }
  //Delete Pokemon & his Stats
  @UseGuards(AuthGuard)
  @Delete('pokemon/:pokemonId')
  removePokemon(@Param('pokemonId') pokemonId: string, @Headers('authorization') auth: string) {
    return this.pokemonApiService.removePokemon(+pokemonId, auth);
  }





}
