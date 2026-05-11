import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContestDto } from './dto/create-contest.dto';

@Injectable()
export class ContestService {
  constructor(private prisma: PrismaService) { }

  async create(createContestDto: CreateContestDto) {
    const newContest = await this.prisma.contest.create({
      data: { ...createContestDto }
    })

    return {
      message: "Contest created successfully", contest: newContest
    }
  }

  async findAll() {
    const contests = await this.prisma.contest.findMany();
    return { message: "Contests fetched", contests }
  }

  async findOne(contestId: number) {
    const contest = await this.prisma.contest.findUnique({
      where: { id: contestId }
    })

    if (!contest) throw new NotFoundException('Contest not found')

    return { message: "contest fetched", contest }
  }

  async register(contestId: number, userId: number) {
    await this.findOne(contestId);

    try {
      const registration = await this.prisma.contestRegistration.create({
        data: { contestId, userId }
      })

      return { message: "successfully registered", registration }
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Already registered to this contest')
      throw (error)
    }
  }

  async unregister(contestId: number, userId: number) {
    await this.findOne(contestId);

    try {
      const registration = await this.prisma.contestRegistration.findUnique({
        where: { contestId_userId: { contestId, userId } }
      })

      if (!registration) throw new NotFoundException('registration not found')

      await this.prisma.contestRegistration.delete({
        where: { id: registration.id }
      })

      return { message: "successfully unregistered", registration }
    } catch (error) {
      throw (error)
    }
  }

  async addProblem(contestId: number, problemId: number) {
    await this.findOne(contestId);

    try {
      const problem = await this.prisma.problem.findUnique({
        where: { id: problemId }
      })

      if (!problem) throw new NotFoundException('Problem not found')

      const contestProblem = await this.prisma.contestProblem.create({
        data: { contestId, problemId }
      })

      return { message: "problem added to contest", contestProblem }

    } catch (error) {
      if (error.code === 'P2002') throw new ConflictException('Problem already in this contest')
      throw error
    }
  }

  async deleteProblem(contestId: number, problemId: number) {

    try {
      const contestProblem = await this.prisma.contestProblem.findUnique({
        where: { contestId_problemId: { contestId, problemId } }
      })

      if (!contestProblem) throw new NotFoundException('Problem not found for this contest')

      await this.prisma.contestProblem.delete({
        where: { id: contestProblem.id }
      })

      return { message: "problem removed from contest" }
    } catch (error) {
      throw error
    }
  }
  
}
