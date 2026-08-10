import { mockDeep, mockReset } from "jest-mock-extended";

const prismaMock: any = mockDeep();
export { prismaMock };
beforeEach(() => {
  mockReset(prismaMock);
});
