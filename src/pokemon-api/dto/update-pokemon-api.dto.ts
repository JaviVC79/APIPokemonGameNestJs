import { PartialType } from '@nestjs/mapped-types';
import { CreatePokemonApiDto } from './create-pokemon-api.dto';

export class UpdatePokemonApiDto extends PartialType(CreatePokemonApiDto) {}

