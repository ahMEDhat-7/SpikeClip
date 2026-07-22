import { User } from "../entities/user.entity";

export const USER_REPOSITORY = "USER_REPOSITORY";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  save(user: User): Promise<User>;
}
