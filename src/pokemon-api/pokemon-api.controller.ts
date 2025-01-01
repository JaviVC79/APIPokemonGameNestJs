import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Res, HttpCode, HttpStatus, Headers, HttpException } from '@nestjs/common';
import { PokemonApiService } from './pokemon-api.service';
import { UpdatePokemonApiDto } from './dto/update-pokemon-api.dto';
import { PlayerDto } from './dto/player-dto';
import { PokemonTeamDto } from './dto/pokemon-team-dto';
import { PokemonTypeEntity } from './enums/pokemon-entity-enum';
import { Response } from 'express';
import { AuthGuard } from './auth.guard';
import { baseUrl } from './hash/constants';
import { GameService } from './game.service';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginResponse } from './dto/login-response';
import { SendMailService } from './send-mail.service';


@Controller('pokemon-api')
export class PokemonApiController {
  constructor(
    private readonly pokemonApiService: PokemonApiService,
    private readonly GameService: GameService,
    private readonly sendMailService: SendMailService,
  ) { }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allows a registered user to log in.' })
  @Post('login')
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  async signIn(@Body() user: any): Promise<LoginResponse> {
    return await this.pokemonApiService.login(user);
  }

  @ApiOperation({ summary: 'Allows the creation of a new user in the system' })
  @Post()
  @ApiResponse({ status: 500, description: 'INTERNAL SERVER ERROR.' })
  @ApiResponse({ status: 201, description: 'New user created successfully' })
  async createPlayer(@Body() playerDto: PlayerDto, @Res() res: Response) {
    try {
      const newPlayer = await this.pokemonApiService.createPlayer(playerDto);
      //if (newPlayer.user_id) await this.sendMailService.sendEmail(playerDto.email, newPlayer.user_id, newPlayer.nickName);
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

  @ApiOperation({ summary: 'Create a new Pokemon team for a logged-in player' })
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

  @ApiOperation({ summary: 'Start a new game for a logged-in player' })
  @UseGuards(AuthGuard)
  @Post('startGame')
  async startGame(@Body() playersId: any, @Headers('authorization') auth: string, @Res() res: Response) {
    try {
      const newGame = await this.GameService.startGame(playersId, auth);
      //console.log("post startGgame",newGame)
      return res.json(newGame);
    } catch (error) {
      console.log(error)
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: 'Add a Pokemon to a team for a logged-in player' })
  @UseGuards(AuthGuard)
  @Post('pokemon/:teamId')
  createPokemon(@Body() pokemonData: any, @Param('teamId') teamId: string, @Headers('authorization') auth: string) {
    pokemonData[0].teamId = +teamId;
    return this.pokemonApiService.createPokemonAndStats(pokemonData, auth);
  }
  //Get Methods----------------------------------------------------------------------------------------------------------------------------------------------

  @Get('email_verification/:user_id')
  async emailVerificationByUserId(@Param('user_id') user_id: string) {
    const verifiedPlayer = await this.pokemonApiService.emailVerificationByUserId(user_id);
    if (!verifiedPlayer) throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    return { message: 'Email verification sent successfully' };
  }

  //Get All 
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all data from all registered players (only available to admin)' })
  @UseGuards(AuthGuard)
  @Get()
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 200, description: 'All registered players data' })
  findAll(@Headers('authorization') auth: string) {
    return this.pokemonApiService.findAll(auth);
  }
  //Get teams by user_id
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch teams data from a logged player' })
  @UseGuards(AuthGuard)
  @Get('teams')
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 200, description: 'All data from logged player' })
  async findTeamsByUserId(@Headers('authorization') auth: string) {
    return await this.pokemonApiService.findTeamsByUserId(auth);
  }
  //Get pokemons by user_id
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch pokemons data from a logged player' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all data from a logged player' })
  @UseGuards(AuthGuard)
  @Get('player')
  async findOne(@Headers('authorization') auth: string, @Res() res: Response) {
    const pokemon = await this.pokemonApiService.findOne(auth);
    return res.json(pokemon);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch started game data from a logged player' })
  @UseGuards(AuthGuard)
  @Get('games')
  async getGamesByUser(@Headers('authorization') auth: string, @Res() res: Response) {
    const games = await this.GameService.getGamesByUser(auth);
    return res.json(games);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch special points data from a logged player' })
  @UseGuards(AuthGuard)
  @Get('specialPoints')
  async getSpecialPoints(@Headers('authorization') auth: string, @Res() res: Response) {
    const specialPoints = await this.GameService.specialPoints(auth);
    return res.json(specialPoints);
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
