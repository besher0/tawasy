import 'reflect-metadata';
import { validate } from 'class-validator';
import {
  CakeFinish,
  CakeShape,
  MoldBaseType,
  MoldFlavor,
  MoldInnerColor,
  MoldOrderType,
  OrderItemKind,
} from '@sugarprecision/shared-types';
import { CreateOrderItemDto } from './create-order-item.dto';

function itemDto(value: Partial<CreateOrderItemDto>) {
  return Object.assign(new CreateOrderItemDto(), value);
}

describe('CreateOrderItemDto', () => {
  it('accepts fridge molds without standard mold fields', async () => {
    const errors = await validate(
      itemDto({
        itemKind: OrderItemKind.MOLD,
        moldOrderType: MoldOrderType.FRIDGE,
        fridgeMoldName: 'قالب براد فواكه',
        referenceImages: [],
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it('keeps standard mold validation for existing mold payloads', async () => {
    const errors = await validate(
      itemDto({
        itemKind: OrderItemKind.MOLD,
        hasTopDecoration: false,
        layers: 1,
        shape: CakeShape.ROUND,
        moldFlavor: MoldFlavor.CREAM,
        moldInnerColor: MoldInnerColor.WHITE,
        hasFillings: false,
        moldBaseType: MoldBaseType.NONE,
        finishType: CakeFinish.NONE,
        peopleCount: 8,
        referenceImages: [],
      }),
    );

    expect(errors.some((error) => error.property === 'moldColor')).toBe(true);
  });
});
