export const TEXTURE_MAP = {
  grass:{
    default: "textures/grass.jpg"
  },
  concrete:{
    default: "textures/concrete.jpg",
  },
  concreteDetail:{
    color:"textures/concrete/Concrete030_1K-PNG_Color.png",
    gl:"textures/concrete/Concrete030_1K-PNG_NormalGL.png",
    roughness:"textures/concrete/Concrete030_1K-PNG_Roughness.png",
    ambientOcc:"textures/concrete/Concrete030_1K-PNG_AmbientOcclusion.png"
  },
  column: {
    color: "textures/column/corrugated_iron_03_diff_1k.jpg",
    normal: "textures/column/corrugated_iron_03_nor_gl_1k.jpg",
    arm: "textures/column/corrugated_iron_03_arm_1k.jpg"
  }
} as const
