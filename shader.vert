uniform mat4 u_modelViewProjMatrix;
attribute vec3 vPosition;

#ifdef VERTEX_COLOR
	attribute vec4 vColor;
	varying vec4 v_Color;
#endif

#ifdef VERTEX_TEXTURE
	attribute vec4 vTexcoord;
	varying vec4 v_Texcoord;
#endif

#if (VERTEX_SIKINNING >= 1)
	uniform mat4 matrixBone0;
	uniform mat4 matrixBone1;
	uniform mat4 matrixBone2;
	uniform mat4 matrixBone3;
	uniform mat4 matrixBone4;
	uniform mat4 matrixBone5;
	uniform mat4 matrixBone6;
	uniform mat4 matrixBone7;

	attribute vec4 vertexWeight1;
	attribute vec4 vertexWeight2;

	mat4 getMatrixBone(int index) {
		if (index == 0) return matrixBone0;
		if (index == 1) return matrixBone1;
		if (index == 2) return matrixBone2;
		if (index == 3) return matrixBone3;
		if (index == 4) return matrixBone4;
		if (index == 5) return matrixBone5;
		if (index == 6) return matrixBone6;
		return matrixBone7;
	}

	float getVertexWeight(int index) {
		if (index == 0) return vertexWeight1.x;
		if (index == 1) return vertexWeight1.y;
		if (index == 2) return vertexWeight1.z;
		if (index == 3) return vertexWeight1.w;
		if (index == 4) return vertexWeight2.x;
		if (index == 5) return vertexWeight2.y;
		if (index == 6) return vertexWeight2.z;
		return vertexWeight2.w;
	}

	vec4 performSkinning(vec4 vertexIn) {
		vec4 vertexOut = vec4(0.0, 0.0, 0.0, 0.0);
	
		float totalWeight = 0.0;
		for (int n = 0; n < VERTEX_SIKINNING; n++) totalWeight += getVertexWeight(n);
		for (int n = 0; n < VERTEX_SIKINNING; n++) vertexOut += (getMatrixBone(n) * (getVertexWeight(n) / totalWeight)) * vertexIn;

		return vertexOut;
	}

	//vec4 prepareNormal(vec4 normal) {
	//	return hasReversedNormal ? -normal : normal;
	//}
#endif

void main() {
	#ifdef VERTEX_COLOR
		v_Color = vColor;
	#endif
	#ifdef VERTEX_TEXTURE
		v_Texcoord = vTexcoord;
	#endif

	vec4 pos = vec4(vPosition, 1.0);
	#if (VERTEX_SIKINNING >= 1)
		pos = performSkinning(pos);
	#endif
	gl_Position = u_modelViewProjMatrix * pos;
}
