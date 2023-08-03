import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export class IEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  updated: Date;

  static copy<T extends IEntity>(entity: T): Partial<T> {
    const copy: Partial<T> = { ...entity };
    copy.id = undefined;
    copy.updated = undefined;
    copy.created = undefined;

    return copy;
  }
}

export type UpdateResult<T extends IEntity> = [number, Partial<T>];
