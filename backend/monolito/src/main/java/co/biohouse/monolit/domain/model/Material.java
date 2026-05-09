package co.biohouse.monolit.domain.model;

// The model 3D have materials with data how position, rotation and type material

public class Material {
    private String typeMaterial;
    private double positionX, positionY, positionZ;
    private double rotationX, rotationY, rotationZ;
    private double opacity;
    private String assetPath;
    private int floorLevel;
    private String blockSize;
    private Double scaleX;
    private Double scaleY;
    private Double scaleZ;
    private Boolean isStarterBlock;

    public Material() {
        this.typeMaterial = "";
        this.positionX = 0;
        this.positionY = 0;
        this.positionZ = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.opacity = 0;
        this.assetPath = "";
        this.floorLevel = 0;
        this.blockSize = "full";
        this.scaleX = 1.0;
        this.scaleY = 1.0;
        this.scaleZ = 1.0;
        this.isStarterBlock = false;
    }

    public Material(String typeMaterial, double positionX, double positionY, double positionZ,
                    double rotationX, double rotationY, double rotationZ,
                    double opacity, String assetPath) {
        this.typeMaterial = typeMaterial;
        this.positionX = positionX;
        this.positionY = positionY;
        this.positionZ = positionZ;
        this.rotationX = rotationX;
        this.rotationY = rotationY;
        this.rotationZ = rotationZ;
        this.opacity = opacity;
        this.assetPath = assetPath;
        this.floorLevel = 0;
    }

    public int getFloorLevel() {
        return floorLevel;
    }

    public void setFloorLevel(int floorLevel) {
        this.floorLevel = floorLevel;
    }

    public String getTypeMaterial() {
        return typeMaterial;
    }

    public void setTypeMaterial(String typeMaterial) {
        this.typeMaterial = typeMaterial;
    }

    public double getPositionX() {
        return positionX;
    }

    public void setPositionX(double positionX) {
        this.positionX = positionX;
    }

    public double getPositionY() {
        return positionY;
    }

    public void setPositionY(double positionY) {
        this.positionY = positionY;
    }

    public double getPositionZ() {
        return positionZ;
    }

    public void setPositionZ(double positionZ) {
        this.positionZ = positionZ;
    }

    public double getRotationX() {
        return rotationX;
    }

    public void setRotationX(double rotationX) {
        this.rotationX = rotationX;
    }

    public double getRotationY() {
        return rotationY;
    }

    public void setRotationY(double rotationY) {
        this.rotationY = rotationY;
    }

    public double getRotationZ() {
        return rotationZ;
    }

    public void setRotationZ(double rotationZ) {
        this.rotationZ = rotationZ;
    }

    public double getOpacity() {
        return opacity;
    }

    public void setOpacity(double opacity) {
        this.opacity = opacity;
    }

    public String getAssetPath() {
        return assetPath;
    }

    public void setAssetPath(String assetPath) {
        this.assetPath = assetPath;
    }

    public String getBlockSize() {
        return blockSize;
    }

    public void setBlockSize(String blockSize) {
        this.blockSize = blockSize;
    }

    public Double getScaleX() {
        return scaleX;
    }

    public void setScaleX(Double scaleX) {
        this.scaleX = scaleX;
    }

    public Double getScaleY() {
        return scaleY;
    }

    public void setScaleY(Double scaleY) {
        this.scaleY = scaleY;
    }

    public Double getScaleZ() {
        return scaleZ;
    }

    public void setScaleZ(Double scaleZ) {
        this.scaleZ = scaleZ;
    }

    public Boolean getIsStarterBlock() {
        return isStarterBlock;
    }

    public void setIsStarterBlock(Boolean isStarterBlock) {
        this.isStarterBlock = isStarterBlock;
    }
}
