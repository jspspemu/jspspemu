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

void main() {
	#ifdef VERTEX_COLOR
		v_Color = vColor;
	#endif
	#ifdef VERTEX_TEXTURE
		v_Texcoord = vTexcoord;
	#endif
	gl_Position = u_modelViewProjMatrix * vec4(vPosition, 1.0);
}
